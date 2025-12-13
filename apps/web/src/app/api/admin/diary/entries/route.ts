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
          urgency_level,
          counselor_name,
          is_visible_to_user,
          assigned_counselor,
          counselor_memo_read,
          is_counselor_comment_public,
          is_ai_comment_public
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

    // Fetch user profiles for display names
    const userIds = [...new Set((data || []).map((entry) => entry.user_id))];
    let profilesMap = new Map<string, { display_name: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await adminSupabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      if (!profileError && profiles) {
        profilesMap = new Map(profiles.map((profile) => [profile.id, profile]));
      }
    }

    // Fetch auth emails for missing names
    const authAdmin = adminSupabase.auth.admin;
    const emailMap = new Map<string, string | null>();
    await Promise.all(
      userIds.map(async (id) => {
        try {
          const { data: userData } = await authAdmin.getUserById(id);
          emailMap.set(id, userData.user?.email ?? null);
        } catch (error) {
          console.error("Failed to load auth user", { id, error });
          emailMap.set(id, null);
        }
      })
    );

    const entries = (data || []).map((entry) => {
      const profile = profilesMap.get(entry.user_id);
      const fallbackEmail = emailMap.get(entry.user_id) ?? null;
      return {
        ...entry,
        user_name: profile?.display_name || fallbackEmail || `ユーザー(${entry.user_id.slice(0, 6)})`,
        user_email: fallbackEmail,
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
