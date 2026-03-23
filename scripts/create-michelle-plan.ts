#!/usr/bin/env tsx
/**
 * PayPal Billing Plan作成スクリプト（1回だけ実行）
 *
 * 使い方:
 *   PAYPAL_CLIENT_ID=xxx PAYPAL_SECRET=xxx PAYPAL_MODE=sandbox npx tsx scripts/create-michelle-plan.ts
 */

const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_SECRET are required");
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function main() {
  console.log("🚀 PayPal Billing Plan作成開始...");
  console.log(`Mode: ${process.env.PAYPAL_MODE ?? "sandbox"}`);
  console.log(`API: ${PAYPAL_API_BASE}\n`);

  const token = await getAccessToken();

  // 1. Product作成
  console.log("📦 Product作成中...");
  const productRes = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "ミシェル心理カウンセラー",
      description: "テープ式心理学に基づくAI心理カウンセラー",
      type: "SERVICE",
      category: "COUNSELING_SERVICES",
    }),
  });
  const product = (await productRes.json()) as { id: string; name: string };
  console.log(`✅ Product ID: ${product.id}\n`);

  // 2. Billing Plan作成
  console.log("📋 Billing Plan作成中...");
  const planRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: product.id,
      name: "ミシェル月額プラン",
      description: "月額1,980円 — AI心理カウンセラー ミシェル",
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: "1980", currency_code: "JPY" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    }),
  });
  const plan = (await planRes.json()) as { id: string; name: string; status: string };
  console.log(`✅ Plan ID: ${plan.id}`);
  console.log(`   Status: ${plan.status}\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📝 以下の環境変数をVercelに追加してください:");
  console.log(`   NEXT_PUBLIC_MICHELLE_PLAN_ID="${plan.id}"`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch(console.error);
