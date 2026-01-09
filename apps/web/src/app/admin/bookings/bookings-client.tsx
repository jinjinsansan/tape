"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, RefreshCcw, TrendingUp, Wallet, Calendar, Trash2 } from "lucide-react";

import { COUNSELOR_PLAN_CONFIGS } from "@/constants/counselor-plans";

type AdminBooking = {
  id: string;
  status: string;
  payment_status: string;
  plan_type: keyof typeof COUNSELOR_PLAN_CONFIGS | string;
  price_cents: number;
  notes: string | null;
  created_at: string;
  slot?: { start_time: string | null; end_time: string | null } | null;
  client?: { id: string; display_name: string | null } | null;
  counselor?: { id: string; display_name: string | null; slug?: string | null } | null;
};

type BookingSummary = {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  paidBookings: number;
  totalRevenueCents: number;
  monthly: Array<{ month: string; revenueCents: number; bookingCount: number }>;
};

const STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "仮予約 (pending)" },
  { value: "confirmed", label: "確定 (confirmed)" },
  { value: "completed", label: "実施済 (completed)" },
  { value: "cancelled", label: "キャンセル" }
];

const PAYMENT_OPTIONS = [
  { value: "all", label: "支払い状態: すべて" },
  { value: "paid", label: "支払い済み" },
  { value: "unpaid", label: "未払い" },
  { value: "refunded", label: "返金済み" }
];

const LIMIT_OPTIONS = [50, 100, 200, 400];

const formatYen = (cents: number) => `¥${(cents / 100).toLocaleString("ja-JP")}`;

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("ja-JP") : "日程未設定";

const formatMonthLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-700";
    case "completed":
      return "bg-slate-200 text-slate-700";
    case "cancelled":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
};

export function AdminBookingsClient() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
      if (limit) params.set("limit", String(limit));

      const query = params.toString();
      const res = await fetch(`/api/admin/bookings${query ? `?${query}` : ""}`);

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "予約情報の取得に失敗しました");
      }

      const data = await res.json();
      setBookings(data.bookings ?? []);
      setSummary(data.summary ?? null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "予約情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancel = async (booking: AdminBooking) => {
    if (booking.status === "cancelled") return;
    if (!confirm(`予約ID: ${booking.id}\n${booking.client?.display_name ?? "匿名ユーザー"} の予約をキャンセルしますか？`)) {
      return;
    }

    setProcessingId(booking.id);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "キャンセルに失敗しました");
      }
      await loadData();
      alert("予約をキャンセルしました");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "キャンセルに失敗しました");
    } finally {
      setProcessingId(null);
    }
  };

  const summaryCards = useMemo(
    () => [
      {
        label: "総予約数",
        value: summary?.totalBookings ?? 0,
        icon: Calendar,
        description: `${summary?.paidBookings ?? 0}件が支払い済み`
      },
      {
        label: "Pending",
        value: summary?.pendingBookings ?? 0,
        icon: AlertTriangle,
        description: "対応待ち"
      },
      {
        label: "Confirmed",
        value: summary?.confirmedBookings ?? 0,
        icon: TrendingUp,
        description: `${summary?.completedBookings ?? 0}件が完了済み`
      },
      {
        label: "総売上",
        value: summary ? formatYen(summary.totalRevenueCents) : "¥0",
        icon: Wallet,
        description: "支払い済み予約の合計"
      }
    ],
    [summary]
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-rose-500">ADMIN / BOOKINGS</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">カウンセリング予約・売上管理</h1>
            <p className="text-sm text-slate-500">全カウンセラーの予約状況・売上を一元管理し、重複や誤予約もここで整理できます。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <RefreshCcw className="h-4 w-4" />
              再読み込み
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{card.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{card.description}</p>
                  </div>
                  <div className="rounded-full bg-slate-100 p-3 text-slate-500">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">直近の月次売上</p>
            <p className="text-xs text-slate-500">支払い済み予約の月次サマリー（最大12ヶ月）</p>
            <div className="mt-4 space-y-3">
              {summary?.monthly?.length ? (
                summary.monthly.map((item) => (
                  <div key={item.month} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{formatMonthLabel(item.month)}</p>
                      <p className="text-xs text-slate-500">{item.bookingCount}件 / {formatYen(item.revenueCents)}</p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">データなし</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">フィルター</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                ステータス
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                支払い状態
                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {PAYMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                表示件数
                <select
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {LIMIT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}件まで
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end">
                <button
                  onClick={loadData}
                  className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  フィルター適用
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">予約一覧</p>
              <p className="text-xs text-slate-500">最新 {bookings.length} 件を表示しています</p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                更新中...
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {bookings.length === 0 && !loading ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">該当する予約はありません。</p>
            ) : (
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">予約</th>
                    <th className="px-5 py-3">カウンセラー</th>
                    <th className="px-5 py-3">クライアント</th>
                    <th className="px-5 py-3">プラン / 金額</th>
                    <th className="px-5 py-3">開始日時</th>
                    <th className="px-5 py-3">アクション</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((booking) => {
                    const plan = COUNSELOR_PLAN_CONFIGS[booking.plan_type as keyof typeof COUNSELOR_PLAN_CONFIGS] ?? null;
                    return (
                      <tr key={booking.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{booking.id.slice(0, 8)}...</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold">
                            <span className={`rounded-full px-2 py-0.5 ${statusBadgeClass(booking.status)}`}>
                              {booking.status}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                              {booking.payment_status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">作成: {formatDateTime(booking.created_at)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{booking.counselor?.display_name ?? "-"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{booking.client?.display_name ?? "匿名"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{plan?.title ?? booking.plan_type}</p>
                          <p className="text-xs text-slate-500">{formatYen(booking.price_cents)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-slate-800">{formatDateTime(booking.slot?.start_time ?? null)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => navigator.clipboard.writeText(booking.id)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              IDコピー
                            </button>
                            <button
                              onClick={() => handleCancel(booking)}
                              disabled={booking.status === "cancelled" || processingId === booking.id}
                              className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {processingId === booking.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              キャンセル
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
