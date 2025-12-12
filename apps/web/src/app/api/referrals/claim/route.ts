import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { claimReferralCode } from "@/server/services/referrals";

const bodySchema = z.object({ code: z.string().optional() }).optional();

const REFERRAL_COOKIE = "tape_referral_code";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Claim referral code");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.parse(body ?? undefined);
    const fallbackCode = cookieStore.get(REFERRAL_COOKIE)?.value;
    const code = parsed?.code?.trim() || fallbackCode?.trim();

    if (!code) {
      return NextResponse.json({ error: "招待コードが見つかりません" }, { status: 400 });
    }

    const referral = await claimReferralCode(user.id, code);

    // clear cookie when used
    cookieStore.set(REFERRAL_COOKIE, "", {
      path: "/",
      maxAge: 0
    });

    return NextResponse.json({ referral });
  } catch (error) {
    console.error("Failed to claim referral", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "紹介コードの登録に失敗しました" }, { status: 400 });
  }
}
