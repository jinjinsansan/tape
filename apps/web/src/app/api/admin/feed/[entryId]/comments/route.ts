import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response } = await ensureAdmin(supabase, "Admin feed comments");
  if (response) return response;

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
      .select("id, display_name")
      .in("id", userIds);

    const profilesMap = new Map(
      (profilesData || []).map((profile) => [profile.id, profile])
    );

    const formattedComments = (comments || []).map((comment) => {
      const profile = comment.commenter_user_id ? profilesMap.get(comment.commenter_user_id) : null;
      return {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        commenter_name: profile?.display_name || "匿名ユーザー"
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
