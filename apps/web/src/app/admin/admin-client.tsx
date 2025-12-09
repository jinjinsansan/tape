"use client";

import { useCallback, useEffect, useState } from "react";

type AdminStats = {
  users: number;
  publicDiaries: number;
  pendingReports: number;
  pendingBookings: number;
};

type DiaryReport = {
  id: string;
  reason: string;
  created_at: string;
  entry: {
    id: string;
    content: string;
    visibility: string;
    published_at: string | null;
  } | null;
  reporter: {
    id: string;
    display_name: string | null;
  } | null;
};

type AdminUserRow = {
  id: string;
  displayName: string | null;
  role: string;
  createdAt: string;
  wallet: {
    balanceCents: number;
    status: string;
  } | null;
};

type NotificationRow = {
  id: string;
  user_id: string;
  channel: string;
  type: string;
  title: string | null;
  body: string | null;
  created_at: string;
  sent_at: string | null;
  deliveries?: { channel: string; status: string; external_reference: string | null }[];
};

type KnowledgeRow = {
  id: string;
  content: string;
  source: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  child_count: number;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  total_duration_seconds: number | null;
};

type CounselorRow = {
  id: string;
  display_name: string;
  slug: string;
  is_active: boolean;
  specialties: string[] | null;
  created_at: string;
  booking_count: number;
};

type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type HealthStatus = {
  supabase: boolean;
  openaiConfigured: boolean;
  resendConfigured: boolean;
  featureFlags: Record<string, string>;
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-black text-slate-900">{value.toLocaleString()}</p>
  </div>
);

export function AdminClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<DiaryReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [counselors, setCounselors] = useState<CounselorRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const fetchJson = async <T,>(url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.error ?? "リクエストに失敗しました");
    }
    return (await res.json()) as T;
  };

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchJson<AdminStats>("/api/admin/stats");
      setStats(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "統計の取得に失敗しました");
    }
  }, []);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const data = await fetchJson<{ reports: DiaryReport[] }>("/api/admin/diary/reports");
      setReports(data.reports ?? []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "通報の取得に失敗しました");
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const loadUsers = useCallback(
    async (query?: string) => {
      try {
        const data = await fetchJson<{ users: AdminUserRow[] }>(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`);
        setUsers(data.users ?? []);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "ユーザーの取得に失敗しました");
      }
    },
    []
  );

  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchJson<{ notifications: NotificationRow[] }>("/api/admin/notifications");
      setNotifications(data.notifications ?? []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadKnowledge = useCallback(async () => {
    try {
      const data = await fetchJson<{ items: KnowledgeRow[] }>("/api/admin/michelle/knowledge");
      setKnowledge(data.items ?? []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      const data = await fetchJson<{ courses: CourseRow[] }>("/api/admin/courses");
      setCourses(data.courses ?? []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadCounselors = useCallback(async () => {
    try {
      const data = await fetchJson<{ counselors: CounselorRow[] }>("/api/admin/counselors");
      setCounselors(data.counselors ?? []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      const data = await fetchJson<{ logs: AuditLog[] }>("/api/admin/audit-logs");
      setAuditLogs(data.logs ?? []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      const data = await fetchJson<{ health: HealthStatus }>("/api/admin/health");
      setHealth(data.health);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadReports();
    loadUsers();
    loadNotifications();
    loadKnowledge();
    loadCourses();
    loadCounselors();
    loadAuditLogs();
    loadHealth();
  }, [
    loadStats,
    loadReports,
    loadUsers,
    loadNotifications,
    loadKnowledge,
    loadCourses,
    loadCounselors,
    loadAuditLogs,
    loadHealth
  ]);

  const updateVisibility = async (entryId: string, visibility: "public" | "private") => {
    try {
      await fetchJson(`/api/admin/diary/entries/${entryId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility })
      });
      loadReports();
      loadStats();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "公開設定の更新に失敗しました");
    }
  };

  const resolveReport = async (reportId: string) => {
    const note = prompt("対応メモ (任意)") ?? undefined;
    try {
      await fetchJson(`/api/admin/diary/reports/${reportId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note })
      });
      loadReports();
      loadStats();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "通報の解決に失敗しました");
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await fetchJson(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "ロール変更に失敗しました");
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

  const handleWalletStatus = async (userId: string, status: "active" | "locked") => {
    try {
      await fetchJson(`/api/admin/users/${userId}/wallet-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "ウォレット状態の更新に失敗しました");
    }
  };

  const handleKnowledgeDelete = async (id: string) => {
    if (!confirm("このナレッジを削除しますか？")) return;
    try {
      await fetchJson(`/api/admin/michelle/knowledge/${id}`, { method: "DELETE" });
      loadKnowledge();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const handleCoursePublishToggle = async (courseId: string, published: boolean) => {
    try {
      await fetchJson(`/api/admin/courses/${courseId}/published`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published })
      });
      loadCourses();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "公開設定の更新に失敗しました");
    }
  };

  const handleCounselorActive = async (counselorId: string, isActive: boolean) => {
    try {
      await fetchJson(`/api/admin/counselors/${counselorId}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive })
      });
      loadCounselors();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "カウンセラー状態の更新に失敗しました");
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.3em] text-rose-500">ADMIN PANEL</p>
        <h1 className="text-3xl font-black text-slate-900">管理者ダッシュボード</h1>
        <p className="text-sm text-slate-500">Tape式心理学プラットフォーム全体の状態を確認できます。</p>
      </header>

      {error && <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-600">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats ? (
          <>
            <StatCard label="登録ユーザー" value={stats.users} />
            <StatCard label="公開日記" value={stats.publicDiaries} />
            <StatCard label="未処理通報" value={stats.pendingReports} />
            <StatCard label="予約待ち" value={stats.pendingBookings} />
          </>
        ) : (
          <p className="col-span-4 rounded-2xl border border-slate-100 bg-white/80 p-4 text-center text-sm text-slate-500">統計を読み込み中...</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-500">通報キュー</p>
            <h2 className="text-xl font-black text-slate-900">公開日記の通報一覧</h2>
          </div>
          <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-500" onClick={loadReports}>
            再読み込み
          </button>
        </div>
        {loadingReports ? (
          <p className="mt-4 text-sm text-slate-500">読み込み中...</p>
        ) : reports.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">未処理の通報はありません。</p>
        ) : (
          <div className="mt-4 space-y-4">
            {reports.map((report) => (
              <article key={report.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-700">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>報告者: {report.reporter?.display_name ?? "不明"}</span>
                  <span>{new Date(report.created_at).toLocaleString("ja-JP")}</span>
                </div>
                <p className="mt-2 text-xs text-rose-500">理由: {report.reason}</p>
                <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-white p-3 text-xs text-slate-600">
                  {report.entry?.content ?? "(削除された日記)"}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => resolveReport(report.id)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs hover:bg-slate-50"
                  >
                    解決済みにする
                  </button>
                  <button
                    onClick={() => updateVisibility(report.entry!.id, "private")}
                    disabled={!report.entry}
                    className="rounded-full bg-rose-500 px-3 py-1 text-xs text-white hover:bg-rose-600 disabled:opacity-50"
                  >
                    日記を非公開にする
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
        <h2 className="text-xl font-black text-slate-900">ユーザー管理</h2>
        <input 
          value={userSearch} 
          onChange={(e) => { setUserSearch(e.target.value); loadUsers(e.target.value); }} 
          placeholder="名前やIDで検索" 
          className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        />
        <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-sm">
              <div>
                <p className="font-bold">{user.displayName ?? "No Name"}</p>
                <p className="text-xs text-slate-400">{user.id} / {user.role}</p>
                <p className="text-xs text-slate-500">Wallet: {user.wallet?.balanceCents} JPY ({user.wallet?.status})</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleRoleChange(user.id, "admin")} className="text-xs text-blue-500">Admin化</button>
                <button onClick={() => handleWalletAdjust(user.id, "credit")} className="text-xs text-green-500">付与</button>
                <button onClick={() => handleWalletStatus(user.id, user.wallet?.status === "active" ? "locked" : "active")} className="text-xs text-red-500">凍結/解除</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
        <h2 className="text-xl font-black text-slate-900">システム状態</h2>
        {health && (
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className={`p-3 rounded-xl ${health.supabase ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              Supabase: {health.supabase ? 'OK' : 'Error'}
            </div>
            <div className={`p-3 rounded-xl ${health.openaiConfigured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              OpenAI: {health.openaiConfigured ? 'Configured' : 'Not Configured'}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
