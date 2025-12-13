import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getUserInsightsForAdmin } from "@/server/services/admin";

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin user insights");
  if (response) return response;

  try {
    const insights = await getUserInsightsForAdmin(params.userId);
    return NextResponse.json({ insights });
  } catch (error) {
    console.error("[Admin] Failed to load user insights", error);
    return NextResponse.json({ error: "Failed to load insights" }, { status: 500 });
  }
}
