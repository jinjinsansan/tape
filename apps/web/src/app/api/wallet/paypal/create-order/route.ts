import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { ordersController } from "@/lib/paypal";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Create PayPal order");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount_cents } = body;

    if (!amount_cents || amount_cents < 100 || amount_cents > 5000000) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const amountInYen = (amount_cents / 100).toFixed(0);

    const collect = {
      body: {
        intent: "CAPTURE",
        purchaseUnits: [
          {
            amount: {
              currencyCode: "JPY",
              value: amountInYen,
            },
            description: `namisapo ウォレットチャージ ¥${amountInYen}`,
          },
        ],
        applicationContext: {
          brandName: "namisapo",
          landingPage: "NO_PREFERENCE",
          userAction: "PAY_NOW",
          returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://namisapo.app"}/mypage`,
          cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://namisapo.app"}/mypage`,
        },
      },
    };

    const { result, ...httpResponse } = await ordersController.createOrder(collect);

    return NextResponse.json({
      orderId: result.id,
    });
  } catch (error) {
    console.error("Failed to create PayPal order", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
