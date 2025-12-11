"use client";

import { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { X, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const isProduction = process.env.NEXT_PUBLIC_PAYPAL_MODE === "live";
const clientId = isProduction
  ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE!
  : process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_SANDBOX!;

type CoursePurchaseModalProps = {
  courseId: string;
  courseTitle: string;
  price: number;
  currency: string;
  onSuccess: () => void;
  onClose: () => void;
};

export function CoursePurchaseModal({
  courseId,
  courseTitle,
  price,
  currency,
  onSuccess,
  onClose
}: CoursePurchaseModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleCreateOrder = async () => {
    try {
      setError(null);
      const slug = window.location.pathname.split("/")[2]; // Extract slug from URL
      const res = await fetch(`/api/courses/${slug}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "注文の作成に失敗しました");
      }

      const data = await res.json();
      return data.orderId;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      throw err;
    }
  };

  const handleApprove = async (data: any) => {
    try {
      setProcessing(true);
      setError(null);
      const slug = window.location.pathname.split("/")[2];
      const res = await fetch(`/api/courses/${slug}/purchase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID })
      });

      if (!res.ok) {
        const responseData = await res.json();
        throw new Error(responseData.error || "決済の処理に失敗しました");
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "決済に失敗しました");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={processing}
          className="absolute top-4 right-4 z-10 rounded-full bg-tape-cream p-2 text-tape-brown hover:bg-tape-beige transition-colors disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-tape-orange to-tape-pink p-6 sm:p-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">コース購入</p>
              <h2 className="text-2xl font-bold">決済情報</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Course Info */}
          <div className="space-y-2">
            <p className="text-sm text-tape-light-brown">コース名</p>
            <p className="text-lg font-bold text-tape-brown">{courseTitle}</p>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-tape-cream">
            <span className="text-sm font-medium text-tape-brown">お支払い金額</span>
            <span className="text-2xl font-bold text-tape-brown">
              {currency === "JPY" ? "¥" : currency}{price.toLocaleString()}
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* PayPal Buttons */}
          {processing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-tape-orange" />
            </div>
          ) : (
            <div className="space-y-3">
              <PayPalScriptProvider
                options={{
                  clientId,
                  currency,
                  intent: "capture"
                }}
              >
                <PayPalButtons
                  style={{
                    layout: "vertical",
                    color: "gold",
                    shape: "rect",
                    label: "paypal"
                  }}
                  createOrder={handleCreateOrder}
                  onApprove={handleApprove}
                  onError={(err) => {
                    console.error("PayPal error:", err);
                    setError("PayPal決済中にエラーが発生しました");
                  }}
                />
              </PayPalScriptProvider>

              <p className="text-xs text-center text-tape-light-brown">
                PayPalで安全に決済できます
              </p>
            </div>
          )}

          {/* Cancel Button */}
          <Button
            onClick={onClose}
            disabled={processing}
            variant="outline"
            className="w-full"
          >
            キャンセル
          </Button>

          {/* Info */}
          <div className="text-xs text-center text-tape-light-brown space-y-1">
            <p>購入後すぐにコースにアクセスできます</p>
            <p>決済は安全に暗号化されています</p>
          </div>
        </div>
      </div>
    </div>
  );
}
