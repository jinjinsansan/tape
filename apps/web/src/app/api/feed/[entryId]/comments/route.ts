import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { awardPoints } from "@/server/services/points";
import { fetchDiaryCountsForUsers, fetchDiaryCountForUser } from "@/server/utils/diary-counts";
import { getAvatarPublicUrl } from "@/lib/supabase/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const { entryId } = params;
  const adminSupabase = getSupabaseAdminClient();

  try {
    // Limit to 100 most recent comments to prevent performance issues
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
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Failed to fetch comments", error);
      throw error;
    }

    // ユーザーIDを収集してプロファイルを一括取得
    const userIds = [...new Set((comments || []).map((c) => c.commenter_user_id).filter(Boolean) as string[])];
    const { data: profilesData } = await adminSupabase
      .from("profiles")
      .select("id, display_name, avatar_url, role")
      .in("id", userIds);

    const profilesMap = new Map(
      (profilesData || []).map((profile) => [profile.id, profile])
    );

    const diaryCountsMap = await fetchDiaryCountsForUsers(adminSupabase, userIds);

    const formattedComments = (comments || []).map((comment) => {
      const profile = comment.commenter_user_id ? profilesMap.get(comment.commenter_user_id) : null;
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        author: {
          id: comment.commenter_user_id,
          displayName: profile?.display_name || "匿名ユーザー",
          avatarUrl: getAvatarPublicUrl(adminSupabase, profile?.avatar_url || null),
          role: profile?.role ?? null,
          diaryCount: comment.commenter_user_id ? diaryCountsMap.get(comment.commenter_user_id) ?? 0 : 0
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
      .select("id, content, created_at, commenter_user_id")
      .single();

    if (error) {
      console.error("Failed to create comment", error);
      throw error;
    }

    // プロファイル情報を別途取得
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("id, display_name, avatar_url, role")
      .eq("id", user.id)
      .single();

    const diaryCount = await fetchDiaryCountForUser(adminSupabase, user.id);

    const formattedComment = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      author: {
        id: comment.commenter_user_id,
        displayName: profile?.display_name || "匿名ユーザー",
        avatarUrl: getAvatarPublicUrl(adminSupabase, profile?.avatar_url || null),
        role: profile?.role ?? null,
        diaryCount
      }
    };

    try {
      await awardPoints({ userId: user.id, action: "feed_comment", referenceId: entryId });
    } catch (awardError) {
      console.error("Failed to award comment points", awardError);
    }

    return NextResponse.json({ comment: formattedComment });
  } catch (error) {
    console.error("Failed to post comment", error);
    return NextResponse.json(
      { error: "Failed to post comment" },
      { status: 500 }
    );
  }
}
