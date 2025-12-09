import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { Database } from "@tape/supabase";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

const countRows = async (
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  table: keyof Database["public"]["Tables"],
  filters?: (query: ReturnType<ReturnType<typeof getSupabaseAdminClient>["from"]>) => typeof query
) => {
  let query = supabase.from(table as string).select("id", { count: "exact", head: true });
  if (filters) {
    query = filters(query);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
};

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response } = await ensureAdmin(supabase, "Admin stats");
  if (response) return response;

  const adminSupabase = getSupabaseAdminClient();

  try {
    const [userCount, publicDiaryCount, pendingReportCount, pendingBookingCount] = await Promise.all([
      countRows(adminSupabase, "profiles"),
      countRows(adminSupabase, "emotion_diary_entries", (query) => query.eq("visibility", "public").is("deleted_at", null)),
      countRows(adminSupabase, "emotion_diary_reports", (query) => query.eq("status", "open")),
      countRows(adminSupabase, "counselor_bookings", (query) => query.eq("status", "pending"))
    ]);

    return NextResponse.json({
      users: userCount,
      publicDiaries: publicDiaryCount,
      pendingReports: pendingReportCount,
      pendingBookings: pendingBookingCount
    });
  } catch (error) {
    console.error("Failed to load admin stats", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
