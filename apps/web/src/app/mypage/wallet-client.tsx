"use client";

import { useCallback, useEffect, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Wallet, TrendingUp, Clock } from "lucide-react";

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
  metadata: any;
};

export function WalletClient() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [chargeAmount, setChargeAmount] = useState<number>(1000);
  const [showPayPal, setShowPayPal] = useState(false);

  const loadWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/balance");
      if (!res.ok) throw new Error("ウォレット情報の取得に失敗しました");
      const data = await res.json();
      setWallet(data.wallet);
      setTransactions(data.transactions ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const handleChargeClick = () => {
    setShowPayPal(true);
  };

  if (loading) {
    return <p className="text-sm text-tape-light-brown text-center py-4">読み込み中...</p>;
  }

  if (!wallet) {
    return <p className="text-sm text-tape-pink text-center py-4">ウォレット情報の取得に失敗しました。</p>;
  }

  const balance = wallet.balance_cents / 100;
  const chargeOptions = [1000, 3000, 5000, 10000];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ウォレット残高 */}
      <div className="rounded-2xl sm:rounded-3xl border border-tape-beige bg-gradient-to-br from-tape-orange/10 to-tape-pink/10 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-tape-orange" />
            <h3 className="text-lg font-bold text-tape-brown">ウォレット残高</h3>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${wallet.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
            {wallet.status}
          </span>
        </div>
        <div className="mb-4">
          <p className="text-4xl font-black text-tape-brown">
            ¥{balance.toLocaleString()}
          </p>
          <p className="text-xs text-tape-light-brown mt-1">{wallet.currency}ポイント</p>
        </div>
        <p className="text-xs text-tape-light-brown mb-4">
          ※ 1ポイント = 1円として、カウンセリング予約やサービスのお支払いにご利用いただけます。
        </p>
        <button
          onClick={handleChargeClick}
          className="w-full rounded-full bg-tape-orange text-white px-6 py-3 font-bold hover:bg-tape-orange/90 flex items-center justify-center gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          ポイントをチャージ
        </button>
      </div>

      {/* チャージUI */}
      {showPayPal && (
        <div className="rounded-2xl sm:rounded-3xl border border-tape-beige bg-white p-4 sm:p-6 shadow-sm">
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
              currency: "JPY",
            }}
          >
            <PayPalButtons
              style={{ layout: "vertical", label: "paypal" }}
              createOrder={async () => {
                const res = await fetch("/api/wallet/paypal/create-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ amount_cents: chargeAmount * 100 }),
                });
                const data = await res.json();
                return data.orderId;
              }}
              onApprove={async (data) => {
                const res = await fetch("/api/wallet/paypal/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId: data.orderID }),
                });
                const result = await res.json();
                if (res.ok) {
                  alert(`¥${chargeAmount.toLocaleString()}のチャージが完了しました！`);
                  setShowPayPal(false);
                  loadWallet();
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

          <button
            onClick={() => setShowPayPal(false)}
            className="mt-4 w-full text-sm text-tape-light-brown hover:underline"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* トランザクション履歴 */}
      <div className="rounded-2xl sm:rounded-3xl border border-tape-beige bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-tape-light-brown" />
          <h3 className="text-lg font-bold text-tape-brown">利用履歴</h3>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-tape-light-brown text-center py-8">まだ履歴がありません。</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const isCredit = tx.type === "topup" || tx.type === "refund";
              const typeLabel = {
                topup: "チャージ",
                consume: "利用",
                refund: "返金",
                adjustment: "調整",
              }[tx.type] || tx.type;

              return (
                <div key={tx.id} className="flex items-center justify-between border-b border-tape-beige pb-3">
                  <div>
                    <p className="text-sm font-semibold text-tape-brown">{typeLabel}</p>
                    <p className="text-xs text-tape-light-brown">
                      {new Date(tx.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isCredit ? "text-green-600" : "text-tape-pink"}`}>
                      {isCredit ? "+" : "-"}¥{Math.abs(tx.amount_cents / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-tape-light-brown">
                      残高: ¥{(tx.balance_after_cents / 100).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
