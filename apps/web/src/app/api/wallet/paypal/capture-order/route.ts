import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { ordersController } from "@/lib/paypal";
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

    const { result, ...httpResponse} = await ordersController.captureOrder(collect);

    // Debug: Log the full result
    console.log("PayPal Capture Result:", JSON.stringify(result, null, 2));

    if (result.status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Get the payment amount - try multiple sources
    const purchaseUnit = result.purchaseUnits?.[0];
    console.log("Purchase Unit:", JSON.stringify(purchaseUnit, null, 2));
    
    let amountValue = purchaseUnit?.amount?.value;
    let currencyCode = purchaseUnit?.amount?.currencyCode;
    
    // If not found in purchaseUnit.amount, try from purchaseUnit.payments.captures
    if (!amountValue && (purchaseUnit as any)?.payments?.captures?.[0]) {
      const capture = (purchaseUnit as any).payments.captures[0];
      console.log("Trying capture from purchaseUnit.payments:", JSON.stringify(capture, null, 2));
      amountValue = capture.amount?.value;
      currencyCode = capture.amount?.currency_code || capture.amount?.currencyCode;
    }
    
    // Fallback: try from result.payments.captures (top level)
    if (!amountValue && (result as any).payments?.captures?.[0]) {
      const capture = (result as any).payments.captures[0];
      console.log("Trying capture from result.payments:", JSON.stringify(capture, null, 2));
      amountValue = capture.amount?.value;
      currencyCode = capture.amount?.currency_code || capture.amount?.currencyCode;
    }
    
    console.log("Amount Value:", amountValue);
    console.log("Currency Code:", currencyCode);

    if (!amountValue) {
      console.error("Amount value is missing!", {
        purchaseUnits: result.purchaseUnits,
        purchaseUnit,
        amount: purchaseUnit?.amount,
        payments: (result as any).payments,
        fullResult: result,
      });
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    // For JPY (zero-decimal currency), amount is already in Yen, not cents
    // For other currencies, multiply by 100
    const isZeroDecimalCurrency = currencyCode === "JPY" || currencyCode === "KRW" || currencyCode === "TWD";
    const amountCents = isZeroDecimalCurrency 
      ? Math.round(parseFloat(amountValue) * 100) // JPY: 100円 → 10000 cents
      : Math.round(parseFloat(amountValue) * 100); // Same formula works for both
    
    console.log("Amount in cents:", amountCents);

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
      category: "wallet",
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
