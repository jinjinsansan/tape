import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { fetchPointRules, listAllRedemptions, listAllRewards } from "@/server/services/points";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response, user } = await ensureAdmin(supabase, "Admin point overview");
  if (response) return response;

  try {
    const [rules, rewards, redemptions] = await Promise.all([
      fetchPointRules(),
      listAllRewards(),
      listAllRedemptions(100)
    ]);

    return NextResponse.json({ rules, rewards, redemptions });
  } catch (error) {
    console.error("Failed to load point overview", error);
    return NextResponse.json({ error: "Failed to load point overview" }, { status: 500 });
  }
}
