import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import * as paypal from "@paypal/paypal-server-sdk";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { paypalClient } from "@/lib/paypal";

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

    const orderRequest = new paypal.orders.OrdersCreateRequest();
    orderRequest.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "JPY",
            value: amountInYen,
          },
          description: `namisapo ウォレットチャージ ¥${amountInYen}`,
        },
      ],
      application_context: {
        brand_name: "namisapo",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://namisapo.app"}/mypage`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://namisapo.app"}/mypage`,
      },
    });

    const response = await paypalClient.execute(orderRequest);
    const order = response.result;

    return NextResponse.json({
      orderId: order.id,
    });
  } catch (error) {
    console.error("Failed to create PayPal order", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
