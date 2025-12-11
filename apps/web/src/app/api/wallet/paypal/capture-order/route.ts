import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { paypalClient } from "@/lib/paypal";
import { topUpWallet } from "@/server/services/wallet";
import { createNotification } from "@/server/services/notifications";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Capture PayPal order");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Capture the order
    const collect = {
      id: orderId,
    };

    const { result, ...httpResponse } = await paypalClient.orders.ordersCapture(collect);

    if (result.status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Get the payment amount
    const purchaseUnit = result.purchaseUnits?.[0];
    const amountValue = purchaseUnit?.amount?.value;

    if (!amountValue) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const amountCents = Math.round(parseFloat(amountValue) * 100);

    // Add to wallet
    const transaction = await topUpWallet(user.id, amountCents, {
      paypal_order_id: orderId,
      payment_method: "paypal",
    });

    // Send notification
    await createNotification({
      userId: user.id,
      channel: "in_app",
      type: "wallet.topup",
      title: "ウォレットチャージ完了",
      body: `¥${(amountCents / 100).toLocaleString()}のチャージが完了しました。`,
      data: { transaction_id: transaction.id, amount_cents: amountCents },
    });

    return NextResponse.json({
      success: true,
      transaction,
      amount_cents: amountCents,
    });
  } catch (error) {
    console.error("Failed to capture PayPal order", error);
    return NextResponse.json({ error: "Failed to capture payment" }, { status: 500 });
  }
}
