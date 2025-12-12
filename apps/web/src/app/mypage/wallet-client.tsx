"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Wallet, TrendingUp, Clock, Gift, Users, Share2 } from "lucide-react";
import type { Database } from "@tape/supabase";

type WalletData = {
  balance_cents: number;
  currency: string;
  status: string;
};

type Transaction = {
  id: string;
  type: string;
  amount_cents: number;
  balance_after_cents: number;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type PointAction = Database["public"]["Enums"]["point_action"];
type PointEvent = Database["public"]["Tables"]["point_events"]["Row"];
type PointReward = Database["public"]["Tables"]["point_rewards"]["Row"];
type PointRedemption = Database["public"]["Tables"]["point_redemptions"]["Row"] & {
  reward?: PointReward | null;
};

type ReferralSummary = {
  referralCode: string | null;
  referredBy: { id: string; displayName: string | null; referralCode: string | null } | null;
  invites: {
    id: string;
    inviteeUserId: string | null;
    inviteeName: string;
    dayCount: number;
    joinedAt: string | null;
    reward5Granted: boolean;
    reward10Granted: boolean;
  }[];
  inviteeProgress: {
    referrer: { id: string; displayName: string | null; referralCode: string | null } | null;
    dayCount: number;
    reward5Granted: boolean;
    reward10Granted: boolean;
  } | null;
};

const actionLabels: Record<PointAction, { label: string; description: string }> = {
  diary_post: { label: "日記投稿", description: "かんじょうにっき" },
  feed_comment: { label: "コメント", description: "みんなの日記" },
  feed_share_x: { label: "SNSシェア", description: "Xへ共有" },
  referral_5days: { label: "紹介特典(5日)", description: "友達が5日投稿" },
  referral_10days: { label: "紹介特典(10日)", description: "友達が10日投稿" },
  admin_adjustment: { label: "調整", description: "管理者" }
};

const redemptionStatusLabel: Record<string, string> = {
  pending: "審査中",
  approved: "承認済み",
  fulfilled: "発送済み",
  cancelled: "キャンセル"
};

export function WalletClient() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pointEvents, setPointEvents] = useState<PointEvent[]>([]);
  const [rewards, setRewards] = useState<PointReward[]>([]);
  const [redemptions, setRedemptions] = useState<PointRedemption[]>([]);
  const [referral, setReferral] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointError, setPointError] = useState<string | null>(null);
  const [chargeAmount, setChargeAmount] = useState<number>(1000);
  const [showPayPal, setShowPayPal] = useState(false);
  const [redeemTarget, setRedeemTarget] = useState<PointReward | null>(null);
  const [redeemQuantity, setRedeemQuantity] = useState(1);
  const [redeemNotes, setRedeemNotes] = useState("");
  const [redeemShipping, setRedeemShipping] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [claimingReferral, setClaimingReferral] = useState(false);
  const [referralMessage, setReferralMessage] = useState<string | null>(null);

  const loadLegacyWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/balance");
      if (!res.ok) {
        throw new Error("ウォレット情報の取得に失敗しました");
      }
      const data = await res.json();
      setWallet(data.wallet ?? null);
      setTransactions(data.transactions ?? []);
    } catch (legacyError) {
      console.error("Failed to load legacy wallet data", legacyError);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/mypage/points/summary");
      let payload: any = null;
      try {
        payload = await res.json();
      } catch (parseError) {
        console.error("Failed to parse wallet summary response", parseError);
      }

      if (!res.ok) {
        const message =
          payload?.details ?? payload?.error ?? "ポイント情報の取得に失敗しました";
        throw new Error(message);
      }

      const data = payload ?? {};
      setWallet(data.wallet ?? null);
      setTransactions(data.transactions ?? []);
      setPointEvents(data.pointEvents ?? []);
      setRewards(data.rewards ?? []);
      setRedemptions(data.redemptions ?? []);
      setReferral(data.referral ?? null);
      setPointError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "ポイント情報の取得に失敗しました";
      setPointError(message);
      console.error("Failed to load wallet dashboard", err);
      await loadLegacyWallet();
    } finally {
      setLoading(false);
    }
  }, [loadLegacyWallet]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleChargeClick = () => {
    setShowPayPal(true);
  };

  const handleRedeemSubmit = async () => {
    if (!redeemTarget) return;
    setRedeeming(true);
    try {
      const res = await fetch("/api/points/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId: redeemTarget.id,
          quantity: redeemQuantity,
          notes: redeemNotes || undefined,
          shipping: redeemShipping || undefined
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "交換に失敗しました");
      }
      alert("ポイント交換を受け付けました。ステータスは履歴で確認できます。");
      setRedeemTarget(null);
      setRedeemQuantity(1);
      setRedeemNotes("");
      setRedeemShipping("");
      loadDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "交換に失敗しました");
    } finally {
      setRedeeming(false);
    }
  };

  const handleClaimReferral = async () => {
    if (!claimCode.trim()) {
      setReferralMessage("招待コードを入力してください");
      return;
    }
    setClaimingReferral(true);
    setReferralMessage(null);
    try {
      const res = await fetch("/api/referrals/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: claimCode.trim() })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "招待コードの登録に失敗しました");
      }
      setReferralMessage("紹介コードを登録しました。進捗は自動的に計測されます。");
      setClaimCode("");
      loadDashboard();
    } catch (err) {
      setReferralMessage(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setClaimingReferral(false);
    }
  };

  const handleCopyReferral = async () => {
    if (!referralUrl) return;
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        alert("お使いのブラウザではコピー機能が利用できません。");
        return;
      }
      await navigator.clipboard.writeText(referralUrl);
      setReferralMessage("紹介URLをコピーしました");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <p className="text-sm text-tape-light-brown text-center py-4">読み込み中...</p>;
  }

  if (!wallet) {
    return <p className="text-sm text-tape-pink text-center py-4">ウォレット情報の取得に失敗しました。</p>;
  }

  const balance = (wallet?.balance_cents ?? 0) / 100;
  const walletStatus = wallet?.status ?? "unknown";
  const chargeOptions = [1000, 3000, 5000, 10000];

  const sortedRewards = useMemo(() => rewards.filter((reward) => reward.is_active), [rewards]);
  const referralUrl = useMemo(() => {
    if (!referral?.referralCode) return null;
    if (typeof window === "undefined") {
      return `/invite/${referral.referralCode}`;
    }
    return `${window.location.origin}/invite/${referral.referralCode}`;
  }, [referral?.referralCode]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-tape-beige bg-gradient-to-br from-tape-orange/10 to-tape-pink/10 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-tape-orange" />
            <h3 className="text-lg font-bold text-tape-brown">ウォレット残高</h3>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              walletStatus === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
            }`}
          >
            {walletStatus}
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <p className="text-4xl font-black text-tape-brown">¥{balance.toLocaleString()}</p>
          <p className="text-xs text-tape-light-brown">1ポイント = 1円 / 動画コース・予約・景品交換に利用可能（現金化不可）</p>
        </div>
            {pointError && (
              <p className="rounded-2xl bg-red-50 px-4 py-2 text-xs text-red-600 shadow-sm">
                {pointError}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleChargeClick}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-tape-orange px-6 py-3 text-sm font-bold text-white shadow hover:bg-tape-orange/90"
          >
            <TrendingUp className="h-4 w-4" /> ポイントをチャージ
          </button>
          <button
            onClick={handleCopyReferral}
            disabled={!referralUrl}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-tape-orange/50 px-6 py-3 text-sm font-bold text-tape-brown hover:bg-white disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" /> 紹介URLをコピー
          </button>
        </div>
      </div>

      {showPayPal && (
        <div className="rounded-2xl border border-tape-beige bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-tape-brown mb-4">チャージ金額を選択</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {chargeOptions.map((amount) => (
              <button
                key={amount}
                onClick={() => setChargeAmount(amount)}
                className={`rounded-2xl border px-4 py-3 text-center font-bold transition-all ${
                  chargeAmount === amount
                    ? "border-tape-orange bg-tape-orange/10 text-tape-brown"
                    : "border-tape-beige bg-white text-tape-light-brown hover:border-tape-orange/50"
                }`}
              >
                ¥{amount.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="mb-4">
            <label className="text-xs text-tape-light-brown mb-1 block">カスタム金額（円）</label>
            <input
              type="number"
              value={chargeAmount}
              onChange={(e) => setChargeAmount(Number(e.target.value))}
              min="100"
              max="50000"
              step="100"
              className="w-full rounded-2xl border border-tape-beige bg-tape-cream/50 px-4 py-3 text-sm text-tape-brown focus:border-tape-orange focus:outline-none focus:ring-1 focus:ring-tape-orange"
            />
          </div>

          <PayPalScriptProvider
            options={{
              clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
              currency: "JPY"
            }}
          >
            <PayPalButtons
              style={{ layout: "vertical", label: "paypal" }}
              createOrder={async () => {
                const res = await fetch("/api/wallet/paypal/create-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ amount_cents: chargeAmount * 100 })
                });
                const data = await res.json();
                return data.orderId;
              }}
              onApprove={async (data) => {
                const res = await fetch("/api/wallet/paypal/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId: data.orderID })
                });
                const result = await res.json();
                if (res.ok) {
                  alert(`¥${chargeAmount.toLocaleString()}のチャージが完了しました！`);
                  setShowPayPal(false);
                  loadDashboard();
                } else {
                  alert("チャージに失敗しました: " + (result.error || "不明なエラー"));
                }
              }}
              onError={(err) => {
                console.error("PayPal error:", err);
                alert("決済処理中にエラーが発生しました。");
              }}
            />
          </PayPalScriptProvider>

          <button onClick={() => setShowPayPal(false)} className="mt-4 w-full text-sm text-tape-light-brown hover:underline">
            キャンセル
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-tape-beige bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="h-5 w-5 text-tape-pink" />
          <h3 className="text-lg font-bold text-tape-brown">ポイント交換</h3>
        </div>
        {sortedRewards.length === 0 ? (
          <p className="text-sm text-tape-light-brown">現在交換できる景品はありません。</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedRewards.map((reward) => (
              <div
                key={reward.id}
                className="rounded-2xl border border-tape-beige bg-tape-cream/40 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-tape-brown">{reward.title}</h4>
                  <p className="text-sm font-semibold text-tape-pink">{reward.cost_points.toLocaleString()}pt</p>
                </div>
                {reward.description && <p className="text-xs text-tape-brown/80">{reward.description}</p>}
                {reward.stock !== null && (
                  <p className="text-[11px] text-tape-light-brown">在庫: {reward.stock}</p>
                )}
                <button
                  onClick={() => {
                    setRedeemTarget(reward);
                    setRedeemQuantity(1);
                    setRedeemNotes("");
                    setRedeemShipping("");
                  }}
                  className="mt-2 rounded-full bg-tape-brown px-4 py-2 text-xs font-semibold text-white hover:bg-tape-brown/90"
                >
                  交換する
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-tape-beige bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-tape-light-brown" />
          <h3 className="text-lg font-bold text-tape-brown">ポイント履歴</h3>
        </div>
        {pointEvents.length === 0 ? (
          <p className="text-sm text-tape-light-brown">まだポイント履歴がありません。</p>
        ) : (
          <div className="space-y-3">
            {pointEvents.map((event) => {
              const info = actionLabels[event.action] ?? { label: event.action, description: "" };
              return (
                <div key={event.id} className="flex items-center justify-between border-b border-tape-beige pb-3">
                  <div>
                    <p className="text-sm font-semibold text-tape-brown">{info.label}</p>
                    <p className="text-xs text-tape-light-brown">
                      {info.description} / {new Date(event.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-green-600">+{event.points} pt</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-tape-beige bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-tape-orange" />
          <h3 className="text-lg font-bold text-tape-brown">友達紹介プログラム</h3>
        </div>
        {referralMessage && <p className="mb-3 text-xs text-tape-pink">{referralMessage}</p>}
        <div className="rounded-2xl border border-dashed border-tape-beige p-4 text-sm text-tape-brown">
          <p>紹介用URL</p>
          <p className="mt-1 break-all font-mono text-xs text-tape-pink">{referralUrl ?? "取得中..."}</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-tape-light-brown">友達の状況</p>
            <div className="mt-2 space-y-2">
              {(referral?.invites ?? []).map((invite) => (
                <div key={invite.id} className="rounded-xl border border-tape-beige p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-tape-brown">{invite.inviteeName}</p>
                    <p className="text-xs text-tape-light-brown">{invite.dayCount} / 10日</p>
                  </div>
                  <p className="text-[11px] text-tape-light-brown">
                    {invite.reward5Granted ? "5日特典済" : "5日まであと" + Math.max(0, 5 - invite.dayCount) + "日"} / {invite.reward10Granted ? "10日特典済" : `10日まであと${Math.max(0, 10 - invite.dayCount)}日`}
                  </p>
                </div>
              ))}
              {(referral?.invites?.length ?? 0) === 0 && (
                <p className="text-xs text-tape-light-brown">まだ紹介はありません。</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-tape-light-brown">紹介コードを入力</p>
            <div className="mt-2 flex flex-col gap-2">
              <input
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                placeholder="友達から受け取ったコード"
                className="rounded-2xl border border-tape-beige px-4 py-2 text-sm focus:border-tape-pink focus:outline-none"
              />
              <button
                onClick={handleClaimReferral}
                disabled={claimingReferral}
                className="rounded-full bg-tape-pink px-4 py-2 text-sm font-semibold text-white hover:bg-tape-pink/90 disabled:opacity-50"
              >
                紹介コードを登録
              </button>
              {referral?.inviteeProgress && (
                <p className="text-[11px] text-tape-light-brown">
                  あなたの進捗: {referral.inviteeProgress.dayCount} / 10日
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-tape-beige bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-tape-light-brown" />
          <h3 className="text-lg font-bold text-tape-brown">利用履歴</h3>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-tape-light-brown text-center py-8">まだ履歴がありません。</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const isCredit = tx.amount_cents > 0;
              const typeLabel = (
                {
                  topup: "チャージ",
                  consume: "利用",
                  refund: "返金",
                  hold: "保留",
                  release: "解除",
                  bonus: "ボーナス",
                  reward: "景品交換"
                } as Record<string, string>
              )[tx.type] ?? tx.type;

              return (
                <div key={tx.id} className="flex items-center justify-between border-b border-tape-beige pb-3">
                  <div>
                    <p className="text-sm font-semibold text-tape-brown">{typeLabel}</p>
                    <p className="text-xs text-tape-light-brown">{new Date(tx.created_at).toLocaleString("ja-JP")}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isCredit ? "text-green-600" : "text-tape-pink"}`}>
                      {isCredit ? "+" : "-"}¥{Math.abs(tx.amount_cents / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-tape-light-brown">残高: ¥{(tx.balance_after_cents / 100).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {redemptions.length > 0 && (
        <div className="rounded-2xl border border-tape-beige bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-tape-brown mb-4">ポイント交換履歴</h3>
          <div className="space-y-3 text-sm">
            {redemptions.map((redeem) => (
              <div key={redeem.id} className="flex items-center justify-between border-b border-tape-beige pb-3">
                <div>
                  <p className="font-semibold text-tape-brown">{redeem.reward?.title ?? "景品"}</p>
                  <p className="text-xs text-tape-light-brown">
                    {new Date(redeem.created_at).toLocaleString("ja-JP")} / 数量 {redeem.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-tape-pink">-{redeem.points_spent}pt</p>
                  <p className="text-[11px] text-tape-light-brown">
                    {redemptionStatusLabel[redeem.status] ?? redeem.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {redeemTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-md w-full rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-tape-brown">{redeemTarget.title} を交換</h3>
            <p className="mt-1 text-sm text-tape-light-brown">
              必要ポイント: {redeemTarget.cost_points.toLocaleString()}pt
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <label className="block">
                数量
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, redeemTarget.stock ?? 10)}
                  value={redeemQuantity}
                  onChange={(e) => setRedeemQuantity(Number(e.target.value))}
                  className="mt-1 w-full rounded-2xl border border-tape-beige px-3 py-2 focus:border-tape-pink focus:outline-none"
                />
              </label>
              <label className="block">
                連絡メモ（任意）
                <textarea
                  value={redeemNotes}
                  onChange={(e) => setRedeemNotes(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-tape-beige px-3 py-2 focus:border-tape-pink focus:outline-none"
                  rows={3}
                />
              </label>
              <label className="block">
                受け取り先 / 住所等（任意）
                <textarea
                  value={redeemShipping}
                  onChange={(e) => setRedeemShipping(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-tape-beige px-3 py-2 focus:border-tape-pink focus:outline-none"
                  rows={3}
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleRedeemSubmit}
                disabled={redeeming}
                className="flex-1 rounded-full bg-tape-brown px-4 py-2 text-sm font-bold text-white hover:bg-tape-brown/90 disabled:opacity-50"
              >
                {redeeming ? "交換中..." : "ポイントで交換"}
              </button>
              <button
                onClick={() => setRedeemTarget(null)}
                className="flex-1 rounded-full border border-tape-beige px-4 py-2 text-sm font-semibold text-tape-brown hover:bg-tape-cream"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
