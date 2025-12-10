import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getRouteUser } from "@/lib/supabase/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const { entryId } = params;
  const adminSupabase = getSupabaseAdminClient();

  try {
    const { data: comments, error } = await adminSupabase
      .from("emotion_diary_comments")
      .select(
        `
          id,
          content,
          created_at,
          commenter_user_id
        `
      )
      .eq("entry_id", entryId)
      .eq("source", "user")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch comments", error);
      throw error;
    }

    // ユーザーIDを収集してプロファイルを一括取得
    const userIds = [...new Set((comments || []).map((c) => c.commenter_user_id).filter(Boolean) as string[])];
    const { data: profilesData } = await adminSupabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const profilesMap = new Map(
      (profilesData || []).map((profile) => [profile.id, profile])
    );

    const formattedComments = (comments || []).map((comment) => {
      const profile = comment.commenter_user_id ? profilesMap.get(comment.commenter_user_id) : null;
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        author: {
          id: comment.commenter_user_id,
          displayName: profile?.display_name || "匿名ユーザー",
          avatarUrl: profile?.avatar_url || null
        }
      };
    });

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error("Failed to load comments", error);
    return NextResponse.json(
      { error: "Failed to load comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const user = await getRouteUser(supabase, "Post comment");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entryId } = params;
  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  const adminSupabase = getSupabaseAdminClient();

  try {
    // 日記が存在し、公開されていることを確認
    const { data: entry, error: entryError } = await adminSupabase
      .from("emotion_diary_entries")
      .select("id, visibility, deleted_at")
      .eq("id", entryId)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    if (entry.visibility !== "public") {
      return NextResponse.json(
        { error: "This entry is not public" },
        { status: 403 }
      );
    }

    if (entry.deleted_at) {
      return NextResponse.json(
        { error: "This entry has been deleted" },
        { status: 410 }
      );
    }

    const { data: comment, error } = await adminSupabase
      .from("emotion_diary_comments")
      .insert({
        entry_id: entryId,
        commenter_user_id: user.id,
        source: "user",
        content: content.trim()
      })
      .select(
        `
          id,
          content,
          created_at,
          commenter_user_id,
          profiles:profiles!emotion_diary_comments_commenter_user_id_fkey(id, display_name, avatar_url)
        `
      )
      .single();

    if (error) {
      console.error("Failed to create comment", error);
      throw error;
    }

    const formattedComment = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      author: {
        id: comment.commenter_user_id,
        displayName: comment.profiles?.display_name || "匿名ユーザー",
        avatarUrl: comment.profiles?.avatar_url || null
      }
    };

    return NextResponse.json({ comment: formattedComment });
  } catch (error) {
    console.error("Failed to post comment", error);
    return NextResponse.json(
      { error: "Failed to post comment" },
      { status: 500 }
    );
  }
}
