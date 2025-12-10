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
          entry_id,
          reporter_user_id
        `
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to query emotion_diary_reports", error);
      throw error;
    }

    // Fetch related data separately to avoid FK name issues
    const reportsWithDetails = await Promise.all(
      (data ?? []).map(async (report) => {
        const [entryResult, reporterResult] = await Promise.all([
          adminSupabase
            .from("emotion_diary_entries")
            .select("id, content, visibility, published_at, user_id")
            .eq("id", report.entry_id)
            .single(),
          adminSupabase
            .from("profiles")
            .select("id, display_name")
            .eq("id", report.reporter_user_id)
            .single()
        ]);

        return {
          ...report,
          entry: entryResult.data,
          reporter: reporterResult.data
        };
      })
    );

    return NextResponse.json({ reports: reportsWithDetails });
  } catch (error) {
    console.error("Failed to load diary reports", error);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}
