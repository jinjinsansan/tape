import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response } = await ensureAdmin(supabase, "Admin public feed");
  if (response) return response;

  const adminSupabase = getSupabaseAdminClient();

  try {
    const { data, error } = await adminSupabase
      .from("emotion_diary_entries")
      .select(
        `
          id,
          user_id,
          content,
          published_at,
          visibility
        `
      )
      .eq("visibility", "public")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch public diaries", error);
      throw error;
    }

    // ユーザーIDを収集してプロファイルを一括取得
    const userIds = [...new Set((data || []).map((entry) => entry.user_id))];
    const { data: profilesData } = await adminSupabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    const profilesMap = new Map(
      (profilesData || []).map((profile) => [profile.id, profile])
    );

    // コメント数を取得
    const entryIds = (data || []).map((entry) => entry.id);
    let commentCounts: Record<string, number> = {};

    if (entryIds.length > 0) {
      const { data: comments, error: commentsError } = await adminSupabase
        .from("emotion_diary_comments")
        .select("entry_id")
        .in("entry_id", entryIds)
        .eq("source", "user");

      if (!commentsError && comments) {
        commentCounts = comments.reduce((acc, comment) => {
          acc[comment.entry_id] = (acc[comment.entry_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    const entries = (data || []).map((entry) => {
      const profile = profilesMap.get(entry.user_id);
      return {
        id: entry.id,
        user_id: entry.user_id,
        user_name: profile?.display_name || "匿名ユーザー",
        content: entry.content,
        published_at: entry.published_at,
        visibility: entry.visibility,
        comments_count: commentCounts[entry.id] || 0
      };
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Failed to load public diaries", error);
    return NextResponse.json(
      { error: "Failed to load public diaries" },
      { status: 500 }
    );
  }
}
