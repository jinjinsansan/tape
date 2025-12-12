import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getOrCreateWallet } from "@/server/services/wallet";
import { claimReferralCode, getReferralSummary } from "@/server/services/referrals";
import { listActiveRewards, listPointEvents, listRedemptions } from "@/server/services/points";

const REFERRAL_COOKIE = "tape_referral_code";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Point dashboard");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const referralCookie = cookieStore.get(REFERRAL_COOKIE)?.value;
    if (referralCookie) {
      try {
        await claimReferralCode(user.id, referralCookie);
        cookieStore.set(REFERRAL_COOKIE, "", { path: "/", maxAge: 0 });
      } catch (err) {
        console.warn("Referral auto-claim skipped", err);
      }
    }

    const [wallet, transactions, pointEvents, rewards, redemptions, referral] = await Promise.all([
      getOrCreateWallet(user.id),
      (async () => {
        const adminClient = getSupabaseAdminClient();
        const { data } = await adminClient
          .from("transactions")
          .select("id, type, amount_cents, balance_after_cents, created_at, metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        return data ?? [];
      })(),
      listPointEvents(user.id, 25),
      listActiveRewards(),
      listRedemptions(user.id, 20),
      getReferralSummary(user.id)
    ]);

    return NextResponse.json({
      wallet,
      transactions,
      pointEvents,
      rewards,
      redemptions,
      referral
    });
  } catch (error) {
    console.error("Failed to load point dashboard", error);
    return NextResponse.json({ error: "Failed to load point dashboard" }, { status: 500 });
  }
}
