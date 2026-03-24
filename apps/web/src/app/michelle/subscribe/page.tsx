"use client";

import { useSearchParams } from "next/navigation";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Suspense, useState } from "react";

export default function MichelleSubscribePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p>読み込み中...</p></div>}>
      <SubscribeContent />
    </Suspense>
  );
}

function SubscribeContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sid");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const planId = process.env.NEXT_PUBLIC_MICHELLE_PLAN_ID;

  if (!paypalClientId || !planId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-red-500">決済の設定が完了していません</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <div className="mx-auto max-w-md space-y-6">
          <div className="text-6xl">🌸</div>
          <h1 className="text-2xl font-bold text-[#51433c]">
            ありがとうございます！
          </h1>
          <p className="text-[#5a4a42]">
            サブスクリプションが有効になりました。
            <br />
            LINEでミシェルに話しかけてみてください。
            <br />
            あなた専用の心理カウンセラーとして、ずっとそばにいます ✨
          </p>
          <p className="text-sm text-[#a1928b]">
            このページは閉じて大丈夫です
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mx-auto max-w-md space-y-8">
        {/* ヘッダー */}
        <div className="text-center space-y-4">
          <div className="text-5xl">🌸</div>
          <h1 className="text-2xl font-bold text-[#51433c]">
            ミシェル心理カウンセラー
          </h1>
          <p className="text-[#5a4a42]">
            テープ式心理学に基づくAI心理カウンセラーが
            <br />
            あなたにずっと寄り添います
          </p>
        </div>

        {/* 7日間無料バナー */}
        <div className="rounded-2xl bg-gradient-to-r from-[#d59da9] to-[#e8b4bc] p-5 text-center text-white shadow-md">
          <p className="text-lg font-bold">7日間完全無料でお試しいただけます</p>
          <p className="mt-1 text-sm opacity-90">
            無料期間中はすべての機能が使い放題。期間内のキャンセルで料金は一切かかりません。
          </p>
        </div>

        {/* LINE友だち追加ボタン */}
        <a
          href="https://lin.ee/vhrzGg7"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 rounded-2xl bg-[#06C755] p-4 text-white shadow-md hover:bg-[#05b64c] transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          <div>
            <p className="text-lg font-bold">LINEで友だち追加</p>
            <p className="text-xs opacity-90">まずは無料でミシェルと話してみる</p>
          </div>
        </a>

        {/* プラン説明 */}
        <div className="rounded-2xl border border-[#f0e4d8] bg-white p-6 shadow-sm space-y-4">
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-[#d59da9]">7日間無料 → その後</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold text-[#51433c]">¥980</span>
              <span className="text-[#a1928b]">/ 月（税込）</span>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-[#5a4a42]">
            <li className="flex items-center gap-2">
              <span className="text-[#d59da9]">✓</span>
              24時間いつでも相談可能
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#d59da9]">✓</span>
              あなた専用の記憶を持つカウンセラー
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#d59da9]">✓</span>
              テープ式心理学に基づくカウンセリング
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#d59da9]">✓</span>
              人物MAP — あなたの人間関係を把握
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#d59da9]">✓</span>
              いつでもキャンセル可能
            </li>
          </ul>
        </div>

        {/* PayPal ボタン */}
        <div className="rounded-2xl border border-[#f0e4d8] bg-white p-6">
          <PayPalScriptProvider
            options={{
              clientId: paypalClientId,
              vault: true,
              intent: "subscription",
              currency: "JPY",
            }}
          >
            <PayPalButtons
              style={{ layout: "vertical", label: "subscribe" }}
              createSubscription={(_data, actions) => {
                return actions.subscription.create({
                  plan_id: planId,
                  custom_id: sessionId ?? undefined,
                });
              }}
              onApprove={async (data) => {
                // サーバーにサブスクリプション有効化を通知
                try {
                  await fetch("/api/michelle/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      subscriptionId: data.subscriptionID,
                      sessionId,
                    }),
                  });
                  setStatus("success");
                } catch {
                  setStatus("error");
                }
              }}
              onError={() => setStatus("error")}
            />
          </PayPalScriptProvider>

          {status === "error" && (
            <p className="mt-4 text-center text-sm text-red-500">
              決済に失敗しました。もう一度お試しください。
            </p>
          )}
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs text-[#a1928b]">
            PayPalアカウントまたはクレジットカードでお支払いいただけます
          </p>
          <p className="text-xs text-[#a1928b]">
            最初の7日間は無料です。無料期間中にキャンセルすれば料金はかかりません。
            <br />
            8日目以降、月額¥980が自動的に課金されます。
          </p>
        </div>
      </div>
    </div>
  );
}
