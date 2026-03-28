/** PayPal Billing API — サブスクリプション管理 */

const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_SECRET!;
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

/** サブスクリプションの詳細を取得 */
export async function getSubscription(
  subscriptionId: string,
): Promise<{
  id: string;
  status: string;
  billing_info?: {
    next_billing_time?: string;
    last_payment?: { amount: { value: string } };
  };
}> {
  const token = await getAccessToken();
  const response = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.json() as Promise<any>;
}

/** サブスクリプションをキャンセル */
export async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const token = await getAccessToken();
  const response = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: reason ?? "ユーザーによる解約" }),
    },
  );

  if (response.status === 204 || response.ok) {
    return { success: true };
  }

  const err = await response.text().catch(() => "Unknown error");
  return { success: false, error: err };
}

/** Billing Planを作成（初回1回だけ実行） */
export async function createBillingPlan(): Promise<{
  productId: string;
  planId: string;
}> {
  const token = await getAccessToken();

  // 1. Product作成
  const productRes = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "ミシェル心理カウンセラー",
      description: "テープ式心理学に基づくAI心理カウンセラー月額プラン",
      type: "SERVICE",
      category: "COUNSELING_SERVICES",
    }),
  });
  const product = (await productRes.json()) as { id: string };
  console.log("Product created:", product.id);

  // 2. Billing Plan作成
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
          total_cycles: 0, // 無制限
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
  const plan = (await planRes.json()) as { id: string };
  console.log("Plan created:", plan.id);

  return { productId: product.id, planId: plan.id };
}
