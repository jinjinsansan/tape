"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, UserCheck, Coins, CreditCard, Lock, Unlock, Info, Loader2, X, NotebookPen, CalendarClock } from "lucide-react";

import { POINT_ACTION_LABELS } from "@/constants/points";

type UserWallet = {
  balanceCents: number;
  status: string;
};

type AdminUser = {
  id: string;
  displayName: string | null;
  email: string | null;
  role: string;
  roles?: string[];
  wallet: UserWallet | null;
  twitterUsername: string | null;
  xShareCount: number | null;
};

const resolveRoles = (user: AdminUser) => {
  if (user.roles && user.roles.length > 0) {
    return user.roles;
  }
  return user.role ? [user.role] : [];
};

type UserInsights = {
  profile: {
    id: string;
    displayName: string | null;
    role: string;
    email: string | null;
    createdAt: string;
  };
  wallet: UserWallet | null;
  points: {
    totalEarned: number;
    totalRedeemed: number;
    events: Array<{
      id: string;
      action: string;
      points: number;
      reference_id: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }>;
    redemptions: Array<{
      id: string;
      rewardTitle: string | null;
      pointsSpent: number;
      status: string;
      quantity: number;
      createdAt: string;
    }>;
  };
  walletTransactions: Array<{
    id: string;
    type: string;
    amount_cents: number;
    balance_after_cents: number;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>;
  bookings: Array<{
    id: string;
    status: string;
    planType: string;
    priceCents: number;
    currency: string;
    paymentStatus: string;
    createdAt: string;
    counselor: { display_name: string | null; slug: string | null } | null;
    slot: { start_time: string; end_time: string } | null;
  }>;
  diaries: {
    totalCount: number;
    entries: Array<{
      id: string;
      journal_date: string;
      title: string | null;
      visibility: string;
      urgency_level: string | null;
      mood_label: string | null;
      ai_comment_status: string;
      created_at: string;
      published_at: string | null;
    }>;
  };
};

type InsightTab = "overview" | "points" | "wallet" | "bookings" | "diary";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

const formatYen = (cents?: number | null) => {
  if (!Number.isFinite(cents ?? 0)) return "-";
  return `¥${Math.round((cents ?? 0) / 100).toLocaleString("ja-JP")}`;
};

const formatPoints = (points?: number | null) => `${points?.toLocaleString() ?? 0} pt`;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("ja-JP", { hour12: false, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function UsersManagementClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState<string>("user");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [insights, setInsights] = useState<UserInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InsightTab>("overview");

  const loadUsers = useCallback(async (search = "") => {
    setLoading(true);
    try {
      const q = search ? `?q=${encodeURIComponent(search)}` : "";
      const data = await fetchJson<{ users: AdminUser[]; userRole: string }>(`/api/admin/users${q}`);
      setUsers(data.users ?? []);
      setUserRole(data.userRole ?? "user");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const loadInsights = useCallback(async (user: AdminUser) => {
    setInsights(null);
    setInsightsError(null);
    setInsightsLoading(true);
    try {
      const data = await fetchJson<{ insights: UserInsights }>(`/api/admin/users/${user.id}/insights`);
      setInsights(data.insights);
    } catch (err) {
      console.error(err);
      setInsightsError(err instanceof Error ? err.message : "詳細の取得に失敗しました");
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const openDetail = useCallback(
    (user: AdminUser) => {
      setSelectedUser(user);
      setDetailOpen(true);
      setActiveTab("overview");
      loadInsights(user);
    },
    [loadInsights]
  );

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedUser(null);
    setInsights(null);
    setInsightsError(null);
  };

  const walletTotals = useMemo(() => {
    if (!insights) {
      return { topupCents: 0, consumeCents: 0 };
    }
    return insights.walletTransactions.reduce(
      (acc, tx) => {
        if (tx.type === "topup") acc.topupCents += tx.amount_cents;
        if (tx.type === "consume") acc.consumeCents += tx.amount_cents;
        return acc;
      },
      { topupCents: 0, consumeCents: 0 }
    );
  }, [insights]);

  const insightTabs: { key: InsightTab; label: string }[] = [
    { key: "overview", label: "概要" },
    { key: "points", label: "ポイント" },
    { key: "wallet", label: "ウォレット" },
    { key: "bookings", label: "予約" },
    { key: "diary", label: "かんじょうにっき" }
  ];

  const handleRoleChange = async (
    userId: string,
    role: string,
    options?: { counselorActive?: boolean }
  ) => {
    try {
      await fetchJson(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, ...options })
      });
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "ロール変更に失敗しました");
    }
  };

  const handleMakeCounselor = async (user: AdminUser) => {
    if (!confirm("このユーザーをカウンセラーにしますか？")) return;
    try {
      const roles = resolveRoles(user);
      const hasAdmin = roles.includes("admin");
      const targetRole = hasAdmin ? "admin" : "counselor";
      await fetchJson(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole, counselorActive: true })
      });
      alert("カウンセラー権限を付与しました");
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "権限付与に失敗しました");
    }
  };

  const handleRemoveCounselor = async (user: AdminUser) => {
    if (!confirm("このユーザーのカウンセラー権限を解除しますか？\n\n注意: counselorsテーブルのデータは残りますが、通常ユーザーに戻ります。")) return;
    try {
      const roles = resolveRoles(user);
      const hasAdmin = roles.includes("admin");
      const targetRole = hasAdmin ? "admin" : "user";
      await fetchJson(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole, counselorActive: false })
      });
      alert("カウンセラー権限を解除しました");
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "権限解除に失敗しました");
    }
  };

  const handleRemoveAdmin = async (user: AdminUser) => {
    if (!confirm("このユーザーのAdmin権限を解除しますか？")) return;
    const roles = resolveRoles(user);
    const hasCounselor = roles.includes("counselor");
    const fallbackRole = hasCounselor ? "counselor" : "user";
    try {
      await fetchJson(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: fallbackRole, counselorActive: hasCounselor })
      });
      alert("Admin権限を解除しました");
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Admin権限の解除に失敗しました");
    }
  };

  const handlePointAward = async (userId: string) => {
    const pointsStr = prompt("付与するポイント数を入力してください", "100");
    if (!pointsStr) return;
    const points = Number(pointsStr);
    if (!Number.isFinite(points) || points <= 0 || points > 100000) {
      alert("ポイント数が不正です（1〜100000の範囲で入力してください）");
      return;
    }
    const reason = prompt("付与理由を入力してください (任意)") ?? undefined;
    try {
      await fetchJson(`/api/admin/users/${userId}/award-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, reason })
      });
      alert(`${points}ポイントを付与しました`);
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "ポイント付与に失敗しました");
    }
  };

  const handleWalletAdjust = async (userId: string, direction: "credit" | "debit") => {
    const amount = prompt("金額（円）を入力してください", "1000");
    if (!amount) return;
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      alert("金額が不正です");
      return;
    }
    const reason = prompt("理由 (任意)") ?? undefined;
    try {
      await fetchJson(`/api/admin/users/${userId}/wallet-adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: cents, direction, reason })
      });
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "ウォレット調整に失敗しました");
    }
  };

  const handleWalletStatus = async (userId: string, status: string) => {
    const action = status === "active" ? "凍結" : "凍結解除";
    if (!confirm(`このユーザーのウォレットを${action}しますか？`)) return;
    try {
      await fetchJson(`/api/admin/users/${userId}/wallet-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "ステータス変更に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-blue-500">USER MANAGEMENT</p>
          <h1 className="text-4xl font-black text-slate-900">ユーザー管理</h1>
          <p className="text-sm text-slate-500">
            ユーザーの検索・ロール変更・ウォレット調整を管理
          </p>
        </header>

        {/* Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                loadUsers(e.target.value);
              }}
              placeholder="名前・メール・IDで検索"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">ユーザー一覧</h2>
            <p className="text-sm text-slate-500">{users.length}人</p>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">読み込み中...</p>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">ユーザーが見つかりません</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {users.map((user) => {
                const roles = resolveRoles(user);
                const hasAdmin = roles.includes("admin");
                const hasCounselor = roles.includes("counselor");
                const badgeList = roles.length > 0 ? roles : [user.role];
                return (
                  <div
                    key={user.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 truncate">
                          {user.displayName ?? "No Name"}
                        </p>
                        {badgeList.filter(Boolean).map((badge) => {
                          const isAdminBadge = badge === "admin";
                          const isCounselorBadge = badge === "counselor";
                          return (
                            <span
                              key={`${user.id}-${badge}`}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isAdminBadge
                                  ? "bg-blue-100 text-blue-700"
                                  : isCounselorBadge
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {badge}
                            </span>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-xs text-slate-400 truncate">{user.id}</p>
                      <p className="mt-0.5 text-xs text-slate-500 truncate">
                        {user.email ?? "メール未登録"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-slate-600">
                          💰 {formatYen(user.wallet?.balanceCents)}
                        </span>
                        <span
                          className={`${
                            user.wallet?.status === "active"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {user.wallet?.status === "active" ? "🔓 アクティブ" : "🔒 凍結"}
                        </span>
                        {user.twitterUsername && (
                          <>
                            <span className="text-blue-600">
                              🐦 @{user.twitterUsername}
                            </span>
                            <a
                              href={`https://x.com/search?q=%23かんじょうにっき%20OR%20%23テープ式心理学%20from%3A${user.twitterUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              投稿確認 ({user.xShareCount ?? 0}回)
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openDetail(user)}
                        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        <Info className="h-3.5 w-3.5" />
                        詳細
                      </button>
                      {userRole === "admin" && (
                        <>
                          {!hasAdmin ? (
                            <button
                              onClick={() => handleRoleChange(user.id, "admin", { counselorActive: hasCounselor })}
                              className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-600 transition-colors hover:bg-blue-100"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Admin化
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRemoveAdmin(user)}
                              className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-600 transition-colors hover:bg-blue-100"
                            >
                              <X className="h-3.5 w-3.5" />
                              Admin解除
                            </button>
                          )}
                          {hasCounselor ? (
                            <button
                              onClick={() => handleRemoveCounselor(user)}
                              className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-100"
                            >
                              <X className="h-3.5 w-3.5" />
                              カウンセラー解除
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMakeCounselor(user)}
                              className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs text-purple-600 transition-colors hover:bg-purple-100"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              カウンセラー化
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => handlePointAward(user.id)}
                        className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-600 transition-colors hover:bg-amber-100"
                      >
                        <Coins className="h-3.5 w-3.5" />
                        ポイント付与
                      </button>
                      <button
                        onClick={() => handleWalletAdjust(user.id, "credit")}
                        className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-600 transition-colors hover:bg-green-100"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        残高付与
                      </button>
                      <button
                        onClick={() =>
                          handleWalletStatus(
                            user.id,
                            user.wallet?.status === "active" ? "locked" : "active"
                          )
                        }
                        className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-100"
                      >
                        {user.wallet?.status === "active" ? (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            凍結
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3.5 w-3.5" />
                            解除
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    {detailOpen && selectedUser && (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10">
        <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">USER DETAIL</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">{selectedUser.displayName ?? "No Name"}</h2>
              <p className="text-sm text-slate-500">{selectedUser.email ?? "メール未登録"}</p>
            </div>
            <button
              onClick={closeDetail}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-slate-100 px-6">
            <nav className="flex flex-wrap gap-2 py-3">
              {insightTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    activeTab === tab.key
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-6">
            {insightsLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" /> 読み込み中...
              </div>
            ) : insightsError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-rose-600">
                {insightsError}
              </div>
            ) : insights ? (
              <div className="space-y-6">
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold text-slate-500">トータル獲得</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {formatPoints(insights.points.totalEarned)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold text-slate-500">交換済みポイント</p>
                        <p className="mt-2 text-2xl font-bold text-rose-600">
                          {formatPoints(insights.points.totalRedeemed)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold text-slate-500">ウォレット残高</p>
                        <p className="mt-2 text-2xl font-bold text-emerald-600">
                          {insights.wallet ? formatYen(insights.wallet.balanceCents) : "-"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold text-slate-500">日記投稿数</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {insights.diaries.totalCount.toLocaleString()} 件
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold text-slate-500">予約件数</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {insights.bookings.length}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <h4 className="text-sm font-semibold text-slate-700">アカウント情報</h4>
                      <dl className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <div>
                          <dt className="text-xs text-slate-400">ユーザーID</dt>
                          <dd className="font-mono">{insights.profile.id}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-400">作成日</dt>
                          <dd>{formatDate(insights.profile.createdAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-400">ロール</dt>
                          <dd className="capitalize">{insights.profile.role}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-400">メール</dt>
                          <dd>{insights.profile.email ?? "未登録"}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}

                {activeTab === "points" && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-slate-100 bg-white p-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Coins className="h-4 w-4 text-amber-500" /> ポイント獲得履歴
                      </h4>
                      {insights.points.events.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">履歴がありません</p>
                      ) : (
                        <ul className="mt-4 space-y-3">
                          {insights.points.events.map((evt) => {
                            const info =
                              POINT_ACTION_LABELS[evt.action as keyof typeof POINT_ACTION_LABELS] ?? {
                                label: evt.action,
                                hint: ""
                              };
                            const metadata = (evt.metadata ?? null) as { reason?: unknown } | null;
                            const reason = typeof metadata?.reason === "string" ? metadata.reason : null;
                            return (
                              <li key={evt.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                                <div className="flex items-center justify-between text-sm">
                                  <div>
                                    <p className="font-semibold text-slate-900">{info.label}</p>
                                    <p className="text-xs text-slate-500">{info.hint}</p>
                                  </div>
                                  <span className="font-bold text-emerald-600">+{evt.points}pt</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-400">{formatDateTime(evt.created_at)}</p>
                                {reason && (
                                  <p className="mt-1 text-xs text-slate-500">理由: {reason}</p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>

                    <section className="rounded-2xl border border-slate-100 bg-white p-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <NotebookPen className="h-4 w-4 text-rose-500" /> ポイント使用履歴
                      </h4>
                      {insights.points.redemptions.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">まだ商品交換やカウンセリング利用がありません</p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {insights.points.redemptions.map((redeem) => (
                            <div key={redeem.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-sm">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-900">{redeem.rewardTitle ?? "ポイント消費"}</p>
                                  <p className="text-xs text-slate-500">{redeem.status} / {redeem.quantity}個</p>
                                </div>
                                <span className="font-bold text-rose-600">-{redeem.pointsSpent}pt</span>
                              </div>
                              <p className="mt-1 text-xs text-slate-400">{formatDateTime(redeem.createdAt)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {activeTab === "wallet" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <h4 className="text-sm font-semibold text-slate-700">ウォレットサマリー</h4>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs text-slate-500">残高</p>
                          <p className="text-xl font-bold text-emerald-600">
                            {insights.wallet ? formatYen(insights.wallet.balanceCents) : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">累計チャージ</p>
                          <p className="text-xl font-bold text-slate-900">{formatYen(walletTotals.topupCents)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">累計消費</p>
                          <p className="text-xl font-bold text-rose-600">{formatYen(walletTotals.consumeCents)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CreditCard className="h-4 w-4" /> トランザクション履歴
                      </h4>
                      {insights.walletTransactions.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">ウォレット履歴がありません</p>
                      ) : (
                        <div className="mt-4 space-y-2 text-sm">
                          {insights.walletTransactions.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex flex-wrap items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                            >
                              <div>
                                <p className="font-semibold text-slate-900 capitalize">{tx.type}</p>
                                <p className="text-xs text-slate-500">{formatDateTime(tx.created_at)}</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-base font-bold ${tx.type === "consume" ? "text-rose-600" : "text-emerald-600"}`}>
                                  {tx.type === "consume" ? "-" : "+"}
                                  {formatYen(tx.amount_cents)}
                                </p>
                                <p className="text-xs text-slate-500">残高 {formatYen(tx.balance_after_cents)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "bookings" && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <CalendarClock className="h-4 w-4 text-purple-500" /> カウンセリング予約
                    </h4>
                    {insights.bookings.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-500">予約履歴がありません</p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {insights.bookings.map((booking) => (
                          <div key={booking.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {booking.counselor?.display_name ?? "カウンセラー"}
                                </p>
                                <p className="text-xs text-slate-500">{booking.planType ?? "-"}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-900">{formatYen(booking.priceCents)}</p>
                                <p className="text-xs text-slate-500">{booking.status} / {booking.paymentStatus}</p>
                              </div>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">{formatDateTime(booking.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "diary" && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <NotebookPen className="h-4 w-4 text-pink-500" /> かんじょうにっき投稿
                    </h4>
                    <p className="mt-2 text-xs text-slate-500">累計 {insights.diaries.totalCount} 件</p>
                    {insights.diaries.entries.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-500">投稿履歴がありません</p>
                    ) : (
                      <div className="mt-4 space-y-3 text-sm">
                        {insights.diaries.entries.map((entry) => (
                          <div key={entry.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-semibold text-slate-900">{entry.title ?? "タイトル未設定"}</p>
                                <p className="text-xs text-slate-500">{entry.visibility} / {entry.ai_comment_status}</p>
                              </div>
                              {entry.urgency_level && (
                                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-600">
                                  {entry.urgency_level}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-400">{formatDate(entry.journal_date)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">ユーザー詳細を読み込めませんでした</p>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
