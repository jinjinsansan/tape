import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { redeemReward } from "@/server/services/points";

const bodySchema = z.object({
  rewardId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
  notes: z.string().max(500).optional(),
  shipping: z.string().max(500).optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Redeem reward");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metadata = {
      notes: parsed.data.notes ?? null,
      shipping: parsed.data.shipping ?? null
    };

    const redemption = await redeemReward({
      userId: user.id,
      rewardId: parsed.data.rewardId,
      quantity: parsed.data.quantity,
      metadata
    });

    return NextResponse.json({ redemption });
  } catch (error) {
    console.error("Failed to redeem reward", error);
    return NextResponse.json({ error: "ポイント交換に失敗しました" }, { status: 500 });
  }
}
