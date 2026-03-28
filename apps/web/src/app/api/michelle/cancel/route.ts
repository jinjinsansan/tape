/** Michelle サブスクリプション解約API */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cancelSubscription, getSubscription } from "@/lib/paypal-billing";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const sessionId = body?.sessionId as string | undefined;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const { data: sub, error: fetchError } = await supabase
      .from("line_bot_subscriptions")
      .select("id, paypal_subscription_id, status, current_period_end")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (fetchError || !sub) {
      return NextResponse.json({ error: "サブスクリプションが見つかりません" }, { status: 404 });
    }

    if (sub.status !== "active") {
      return NextResponse.json({
        error: "現在アクティブなサブスクリプションがありません",
        currentStatus: sub.status,
      }, { status: 400 });
    }

    if (!sub.paypal_subscription_id) {
      return NextResponse.json({ error: "PayPal情報が見つかりません" }, { status: 400 });
    }

    // PayPal側でキャンセル
    const result = await cancelSubscription(sub.paypal_subscription_id);

    if (!result.success) {
      console.error("[Cancel] PayPal cancel failed:", result.error);
      return NextResponse.json({ error: "PayPalでの解約に失敗しました" }, { status: 500 });
    }

    // DB更新: ステータスをcancelledに。current_period_endまでは利用可能
    const { error: updateError } = await supabase
      .from("line_bot_subscriptions")
      .update({
        status: "cancelled",
      })
      .eq("id", sub.id);

    if (updateError) {
      console.error("[Cancel] DB update error:", updateError);
      return NextResponse.json({ error: "データベースの更新に失敗しました" }, { status: 500 });
    }

    console.log(`[Cancel] Subscription cancelled for session ${sessionId}`);

    // Telegram通知
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
    if (botToken && chatId) {
      const msg = `⚠️ <b>サブスクリプション解約</b>\n\nSession: ${sessionId.substring(0, 8)}...\nPayPal: ${sub.paypal_subscription_id}\n期間終了: ${sub.current_period_end ?? "不明"}`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      periodEnd: sub.current_period_end,
    });
  } catch (error) {
    console.error("[Cancel] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** 現在のサブスク状態を確認するGET */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sid");

  if (!sessionId) {
    return NextResponse.json({ error: "sid is required" }, { status: 400 });
  }

  const { data: sub } = await supabase
    .from("line_bot_subscriptions")
    .select("status, plan_amount, current_period_end, trial_ends_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const planNames: Record<number, string> = {
    980: "ライト",
    1980: "スタンダード",
    2980: "プレミアム",
  };

  return NextResponse.json({
    status: sub.status,
    planName: planNames[sub.plan_amount] ?? "不明",
    planAmount: sub.plan_amount,
    periodEnd: sub.current_period_end,
    trialEndsAt: sub.trial_ends_at,
  });
}
