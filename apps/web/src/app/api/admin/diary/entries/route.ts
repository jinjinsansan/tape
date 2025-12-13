import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response } = await ensureAdmin(supabase, "Admin diary entries");
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const visibility = searchParams.get("visibility") || "all";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const userId = searchParams.get("userId");

  const adminSupabase = getSupabaseAdminClient();

  try {
    let query = adminSupabase
      .from("emotion_diary_entries")
      .select(
        `
          id,
          user_id,
          title,
          content,
          journal_date,
          published_at,
          visibility,
          mood_label,
          emotion_label,
          created_at,
          ai_comment_status,
          counselor_memo,
          urgency_level
        `,
        { count: "exact" }
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (visibility !== "all") {
      query = query.eq("visibility", visibility);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Failed to fetch diary entries", error);
      throw error;
    }

    // ユーザーIDを収集してプロファイルを一括取得
    const userIds = [...new Set((data || []).map((entry) => entry.user_id))];
    const { data: profilesData } = await adminSupabase
      .from("profiles")
      .select("id, display_name, email")
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
        .select("entry_id, source")
        .in("entry_id", entryIds);

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
        ...entry,
        user_name: profile?.display_name || "匿名ユーザー",
        user_email: profile?.email || null,
        comments_count: commentCounts[entry.id] || 0
      };
    });

    return NextResponse.json({ entries, total: count ?? entries.length });
  } catch (error) {
    console.error("Failed to load diary entries", error);
    return NextResponse.json(
      { error: "Failed to load diary entries" },
      { status: 500 }
    );
  }
}
