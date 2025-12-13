import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { fetchPointRules, listAllRedemptions, listAllRewards, fetchPointAnalytics } from "@/server/services/points";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response, user } = await ensureAdmin(supabase, "Admin point overview");
  if (response) return response;

  try {
    console.log("[Point Overview] Loading rules, rewards, and redemptions...");
    
    const [rules, rewards, redemptions, analytics] = await Promise.all([
      fetchPointRules().catch(err => {
        console.error("[Point Overview] Failed to fetch rules:", err);
        throw new Error(`Rules fetch failed: ${err.message}`);
      }),
      listAllRewards().catch(err => {
        console.error("[Point Overview] Failed to list rewards:", err);
        throw new Error(`Rewards fetch failed: ${err.message}`);
      }),
      listAllRedemptions(100).catch(err => {
        console.error("[Point Overview] Failed to list redemptions:", err);
        throw new Error(`Redemptions fetch failed: ${err.message}`);
      }),
      fetchPointAnalytics().catch(err => {
        console.error("[Point Overview] Failed to build analytics:", err);
        throw new Error(`Analytics fetch failed: ${err.message}`);
      })
    ]);

    console.log("[Point Overview] Successfully loaded:", {
      rulesCount: rules?.length ?? 0,
      rewardsCount: rewards?.length ?? 0,
      redemptionsCount: redemptions?.length ?? 0
    });

    return NextResponse.json({ rules, rewards, redemptions, analytics });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Point Overview] Failed to load point overview:", errorMessage, error);
    return NextResponse.json(
      { error: `Failed to load point overview: ${errorMessage}` }, 
      { status: 500 }
    );
  }
}
