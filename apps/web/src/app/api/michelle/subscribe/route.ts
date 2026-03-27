/** Michelle サブスクリプション有効化API */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSubscription } from "@/lib/paypal-billing";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const subscriptionId = body?.subscriptionId as string | undefined;
  const sessionId = body?.sessionId as string | undefined;
  const plan = (body?.plan as string) ?? "light";
  const amount = (body?.amount as number) ?? 980;

  if (!subscriptionId) {
    return NextResponse.json(
      { error: "subscriptionId is required" },
      { status: 400 },
    );
  }

  try {
    // PayPalでサブスクリプション状態を確認
    const subscription = await getSubscription(subscriptionId);

    if (subscription.status !== "ACTIVE" && subscription.status !== "APPROVED") {
      return NextResponse.json(
        { error: `Subscription is not active: ${subscription.status}` },
        { status: 400 },
      );
    }

    // session_id を特定
    let targetSessionId = sessionId;

    // Allow recovering sessionId from PayPal custom_id (e.g. `${sessionId}` or historical `${sessionId}:${plan}`)
    if (!targetSessionId) {
      const customIdRaw = (subscription as any)?.custom_id as string | undefined;
      const recovered = customIdRaw?.split(":")[0];
      targetSessionId = recovered;
    }

    if (!targetSessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // サブスクリプションを有効化
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const planAmount = amount;

    const { error: updateError } = await supabase
      .from("line_bot_subscriptions")
      .update({
        paypal_subscription_id: subscriptionId,
        status: "active",
        plan_amount: planAmount,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .eq("session_id", targetSessionId);

    if (updateError) {
      console.error("[Subscribe] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to activate subscription" },
        { status: 500 },
      );
    }

    console.log(
      `[Subscribe] Activated subscription for session ${targetSessionId}: ${subscriptionId}`,
    );

    // Telegram通知（管理者に通知）
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
    if (botToken && chatId) {
      const planNames: Record<string, string> = { light: "ライト", standard: "スタンダード", premium: "プレミアム" };
      const planLabel = `${planNames[plan] ?? plan} ¥${amount.toLocaleString()}`;
      const msg = `💰 <b>新規サブスクリプション</b>\n\nプラン: ${planLabel}\nSession: ${targetSessionId?.substring(0, 8)}...\nPayPal: ${subscriptionId}`;
      await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg,
            parse_mode: "HTML",
          }),
        },
      ).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Subscribe] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
