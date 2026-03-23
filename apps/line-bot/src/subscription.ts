/** サブスクリプション管理 — トライアル・課金チェック */

import { supabase } from "./supabase.js";
import { env } from "./env.js";

export type AccessStatus = "trial" | "active" | "expired";

export interface AccessResult {
  status: AccessStatus;
  trialRemainingDays?: number;
}

export async function checkAccess(sessionId: string): Promise<AccessResult> {
  const { data, error } = await supabase
    .from("line_bot_subscriptions")
    .select("status, trial_ends_at, current_period_end")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error || !data) {
    // サブスク未作成 = 新規ユーザー（ensureSessionで作られるはず）
    return { status: "trial", trialRemainingDays: 7 };
  }

  const now = new Date();

  // アクティブなサブスクリプション
  if (data.status === "active") {
    const periodEnd = data.current_period_end
      ? new Date(data.current_period_end)
      : null;
    if (!periodEnd || periodEnd > now) {
      return { status: "active" };
    }
    // 期間切れ
    return { status: "expired" };
  }

  // トライアル期間チェック
  if (data.status === "trial") {
    const trialEnds = new Date(data.trial_ends_at);
    if (now < trialEnds) {
      const remainingMs = trialEnds.getTime() - now.getTime();
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      return { status: "trial", trialRemainingDays: remainingDays };
    }
    // トライアル期間終了
    return { status: "expired" };
  }

  return { status: "expired" };
}

export function buildTrialNotice(
  displayName: string | null,
  remainingDays: number,
): string | null {
  const name = displayName ?? "あなた";
  if (remainingDays === 1) {
    return (
      `${name}さん、無料体験期間が明日で終了します 🌸\n\n` +
      `ミシェルとの会話を続けたい場合は、月額1,980円のサブスクリプションをご検討ください。\n\n` +
      `→ ${env.SUBSCRIBE_URL}`
    );
  }
  return null;
}

export function buildExpiredMessage(
  displayName: string | null,
  sessionId: string,
): string {
  const name = displayName ?? "あなた";
  return (
    `${name}さん、無料体験期間が終了しました。\n\n` +
    `ミシェルは${name}さんのことを覚えています。\n` +
    `これからも${name}さん専用の心理カウンセラーとして、ずっとそばにいたいです 🌸\n\n` +
    `月額1,980円で、いつでも好きなだけ相談できます。\n\n` +
    `→ ${env.SUBSCRIBE_URL}?sid=${sessionId}`
  );
}
