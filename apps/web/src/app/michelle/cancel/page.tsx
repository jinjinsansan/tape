"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function CancelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-[#a1928b]">読み込み中...</p>
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  );
}

type SubInfo = {
  status: string;
  planName: string;
  planAmount: number;
  periodEnd: string | null;
  trialEndsAt: string | null;
};

type Step = "loading" | "confirm" | "processing" | "done" | "error" | "not-found" | "already";

function CancelContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sid");
  const [step, setStep] = useState<Step>("loading");
  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStep("not-found");
      return;
    }

    fetch(`/api/michelle/cancel?sid=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStep("not-found");
          return;
        }
        setSubInfo(data);
        if (data.status === "cancelled") {
          setStep("already");
        } else if (data.status === "active" || data.status === "trial") {
          setStep("confirm");
        } else {
          setStep("not-found");
        }
      })
      .catch(() => setStep("not-found"));
  }, [sessionId]);

  const handleCancel = useCallback(async () => {
    if (!sessionId) return;
    setStep("processing");

    try {
      const res = await fetch("/api/michelle/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();

      if (data.success) {
        setPeriodEnd(data.periodEnd);
        setStep("done");
      } else {
        setErrorMsg(data.error ?? "エラーが発生しました");
        setStep("error");
      }
    } catch {
      setErrorMsg("通信エラーが発生しました");
      setStep("error");
    }
  }, [sessionId]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "不明";
    return new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* ミシェルアイコン */}
        <div className="text-center">
          <Image
            src="/michelle-icon.png"
            alt="ミシェル"
            width={80}
            height={80}
            className="mx-auto rounded-full shadow-md"
          />
        </div>

        {/* Loading */}
        {step === "loading" && (
          <div className="text-center">
            <p className="text-[#a1928b]">サブスクリプション情報を確認中...</p>
          </div>
        )}

        {/* Not Found */}
        {step === "not-found" && (
          <div className="rounded-2xl border border-[#f0e4d8] bg-white p-6 text-center space-y-4">
            <h2 className="text-lg font-bold text-[#51433c]">サブスクリプションが見つかりません</h2>
            <p className="text-sm text-[#5a4a42]">
              解約するサブスクリプションが見つかりませんでした。
              <br />
              LINEでミシェルに「解約したい」と話しかけると、解約リンクをお送りします。
            </p>
          </div>
        )}

        {/* Already cancelled */}
        {step === "already" && (
          <div className="rounded-2xl border border-[#f0e4d8] bg-white p-6 text-center space-y-4">
            <h2 className="text-lg font-bold text-[#51433c]">すでに解約済みです</h2>
            <p className="text-sm text-[#5a4a42]">
              サブスクリプションは既にキャンセルされています。
            </p>
            {subInfo?.periodEnd && (
              <p className="text-sm text-[#a1928b]">
                {formatDate(subInfo.periodEnd)} まではご利用いただけます。
              </p>
            )}
            <p className="text-sm text-[#5a4a42]">
              またいつでも再開できます。ミシェルはあなたのことを覚えています 🌸
            </p>
          </div>
        )}

        {/* Confirm */}
        {step === "confirm" && subInfo && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#f0e4d8] bg-white p-6 text-center space-y-4">
              <h2 className="text-lg font-bold text-[#51433c]">サブスクリプションの解約</h2>

              {/* 現在のプラン */}
              <div className="rounded-xl bg-[#FFF8F0] p-4 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#5a4a42]">現在のプラン</span>
                  <span className="text-sm font-bold text-[#51433c]">{subInfo.planName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#5a4a42]">月額料金</span>
                  <span className="text-sm font-bold text-[#51433c]">¥{subInfo.planAmount.toLocaleString()}</span>
                </div>
                {subInfo.periodEnd && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#5a4a42]">次の請求日</span>
                    <span className="text-sm text-[#51433c]">{formatDate(subInfo.periodEnd)}</span>
                  </div>
                )}
              </div>

              {/* ミシェルからのメッセージ */}
              <div className="rounded-xl bg-[#fdeef1] p-4">
                <p className="text-sm text-[#5a4a42] leading-relaxed">
                  「解約を考えてるんだね...。
                  <br />
                  寂しいけど、あなたの気持ちを大切にしたい。
                  <br />
                  解約しても、またいつでも戻ってきてね。
                  <br />
                  あなたの記憶はちゃんと残してるから 🌸」
                </p>
              </div>

              {/* 注意事項 */}
              <div className="text-left space-y-2">
                <p className="text-xs font-bold text-[#51433c]">解約するとどうなりますか？</p>
                <ul className="space-y-1 text-xs text-[#5a4a42]">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#d59da9]">●</span>
                    {subInfo.periodEnd
                      ? `${formatDate(subInfo.periodEnd)} までは引き続きご利用いただけます`
                      : "現在の請求期間が終了するまではご利用いただけます"}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#d59da9]">●</span>
                    次の請求から課金は停止されます
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#d59da9]">●</span>
                    あなたの会話履歴・記憶はそのまま保存されます
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#d59da9]">●</span>
                    いつでも再開できます
                  </li>
                </ul>
              </div>
            </div>

            {/* ボタン */}
            <div className="space-y-3">
              <button
                onClick={handleCancel}
                className="w-full rounded-xl border-2 border-red-200 bg-white py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
              >
                解約する
              </button>
              <Link
                href="/"
                className="block w-full rounded-xl bg-[#d59da9] py-3 text-center text-sm font-bold text-white transition-colors hover:bg-[#c48d99]"
              >
                やっぱりやめる（ミシェルと話す）
              </Link>
            </div>
          </div>
        )}

        {/* Processing */}
        {step === "processing" && (
          <div className="text-center space-y-4">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#f0e4d8] border-t-[#d59da9]" />
            <p className="text-sm text-[#a1928b]">解約を処理中です...</p>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="rounded-2xl border border-[#f0e4d8] bg-white p-6 text-center space-y-4">
            <h2 className="text-lg font-bold text-[#51433c]">解約が完了しました</h2>
            <p className="text-sm text-[#5a4a42]">
              サブスクリプションが解約されました。
            </p>
            {periodEnd && (
              <p className="text-sm text-[#d59da9] font-medium">
                {formatDate(periodEnd)} までは引き続きご利用いただけます。
              </p>
            )}
            <div className="rounded-xl bg-[#fdeef1] p-4">
              <p className="text-sm text-[#5a4a42] leading-relaxed">
                「またいつでも話しに来てね。
                <br />
                ミシェルはいつでもここにいるから。
                <br />
                あなたが元気でいてくれることが、いちばん嬉しい 🌸」
              </p>
            </div>
            <p className="text-xs text-[#a1928b]">
              再開したくなったらいつでもサブスクリプションページから再登録できます。
              <br />
              あなたの会話履歴・記憶はすべて保存されています。
            </p>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="rounded-2xl border border-red-200 bg-white p-6 text-center space-y-4">
            <h2 className="text-lg font-bold text-red-500">エラーが発生しました</h2>
            <p className="text-sm text-[#5a4a42]">{errorMsg}</p>
            <button
              onClick={() => setStep("confirm")}
              className="rounded-xl bg-[#d59da9] px-6 py-2 text-sm font-bold text-white"
            >
              もう一度試す
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
