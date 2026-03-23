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

        {/* プラン説明 */}
        <div className="rounded-2xl border border-[#f0e4d8] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold text-[#51433c]">¥1,980</span>
            <span className="text-[#a1928b]">/ 月</span>
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

        <p className="text-center text-xs text-[#a1928b]">
          PayPalアカウントまたはクレジットカードでお支払いいただけます
        </p>
      </div>
    </div>
  );
}
