/** PayPal Webhook — サブスクリプションイベント処理 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const eventType = body.event_type as string;
  const resource = body.resource as Record<string, unknown>;

  console.log(`[PayPal Webhook] Event: ${eventType}`);

  try {
    switch (eventType) {
      // サブスクリプション有効化
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const subscriptionId = resource.id as string;
        const customId = resource.custom_id as string | undefined;
        if (subscriptionId) {
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          await supabase
            .from("line_bot_subscriptions")
            .update({
              status: "active",
              paypal_subscription_id: subscriptionId,
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
            })
            .or(
              customId
                ? `session_id.eq.${customId},paypal_subscription_id.eq.${subscriptionId}`
                : `paypal_subscription_id.eq.${subscriptionId}`,
            );

          console.log(`[PayPal Webhook] Subscription activated: ${subscriptionId}`);
        }
        break;
      }

      // 定期課金成功
      case "PAYMENT.SALE.COMPLETED": {
        const billingAgreementId = resource.billing_agreement_id as string;
        if (billingAgreementId) {
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          await supabase
            .from("line_bot_subscriptions")
            .update({
              status: "active",
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
            })
            .eq("paypal_subscription_id", billingAgreementId);

          console.log(`[PayPal Webhook] Payment completed: ${billingAgreementId}`);
        }
        break;
      }

      // サブスクリプションキャンセル
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        const subscriptionId = resource.id as string;
        if (subscriptionId) {
          await supabase
            .from("line_bot_subscriptions")
            .update({ status: "cancelled" })
            .eq("paypal_subscription_id", subscriptionId);

          console.log(`[PayPal Webhook] Subscription cancelled: ${subscriptionId}`);

          // 管理者に通知
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
          if (botToken && chatId) {
            await fetch(
              `https://api.telegram.org/bot${botToken}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `⚠️ <b>サブスクキャンセル</b>\n\nPayPal: ${subscriptionId}`,
                  parse_mode: "HTML",
                }),
              },
            ).catch(() => {});
          }
        }
        break;
      }

      default:
        console.log(`[PayPal Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[PayPal Webhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
