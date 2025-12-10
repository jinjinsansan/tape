import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getRouteUser } from "@/lib/supabase/auth-helpers";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const user = await getRouteUser(supabase, "Admin diary entries");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // admin または counselor のみアクセス可能
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !['admin', 'counselor'].includes(profile.role)) {
    return NextResponse.json(
      { error: "Access denied. Admin or counselor role required." },
      { status: 403 }
    );
  }

  const adminSupabase = getSupabaseAdminClient();

  try {
    const { data, error } = await adminSupabase
      .from("emotion_diary_entries")
      .select(
        `
          id,
          user_id,
          title,
          content,
          emotion_label,
          event_summary,
          realization,
          self_esteem_score,
          worthlessness_score,
          mood_score,
          mood_label,
          energy_level,
          visibility,
          journal_date,
          created_at,
          updated_at,
          counselor_memo,
          counselor_name,
          is_visible_to_user,
          counselor_memo_read,
          assigned_counselor,
          urgency_level
        `
      )
      .is("deleted_at", null)
      .order("journal_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Failed to fetch diary entries", error);
      throw error;
    }

    // ユーザー情報を取得
    const userIds = [...new Set(data.map((entry) => entry.user_id))];
    const { data: profiles, error: profilesError } = await adminSupabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("Failed to fetch profiles", profilesError);
      throw profilesError;
    }

    // ユーザー情報をマッピング
    const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || []);

    const entriesWithUser = data.map((entry) => ({
      ...entry,
      user_name: profileMap.get(entry.user_id) || "Unknown User"
    }));

    return NextResponse.json({ entries: entriesWithUser });
  } catch (error) {
    console.error("Failed to load admin diary entries", error);
    return NextResponse.json(
      { error: "Failed to load entries" },
      { status: 500 }
    );
  }
}
