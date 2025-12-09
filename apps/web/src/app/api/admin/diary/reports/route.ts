import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response } = await ensureAdmin(supabase, "Admin diary reports");
  if (response) return response;

  const adminSupabase = getSupabaseAdminClient();

  try {
    const { data, error } = await adminSupabase
      .from("emotion_diary_reports")
      .select(
        `
          id,
          reason,
          status,
          created_at,
          entry:emotion_diary_entries!emotion_diary_reports_entry_id_fkey(id, content, visibility, published_at, user_id),
          reporter:profiles!emotion_diary_reports_reporter_user_id_fkey(id, display_name)
        `
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ reports: data ?? [] });
  } catch (error) {
    console.error("Failed to load diary reports", error);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}
