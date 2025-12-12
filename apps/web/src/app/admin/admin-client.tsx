"use client";

import { useCallback, useEffect, useState } from "react";
import type { Database } from "@tape/supabase";
import { Button } from "@/components/ui/button";
import { CourseManagement } from "./course-management";

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
  email: string | null;
  wallet: {
    balanceCents: number;
    status: string;
  } | null;
  twitterUsername?: string | null;
  xShareCount?: number;
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

type AdminBroadcastRow = {
  id: string;
  subject: string;
  body: string;
  audience: "all" | "selected";
  target_emails: string[];
  target_count: number;
  created_at: string;
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

type PublicDiaryEntry = {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  published_at: string;
  visibility: string;
  comments_count: number;
};

type DiaryComment = {
  id: string;
  content: string;
  created_at: string;
  commenter_name: string;
};

type PointRule = Database["public"]["Tables"]["point_award_rules"]["Row"];
type PointRewardRow = Database["public"]["Tables"]["point_rewards"]["Row"];
type PointRedemptionRow = Database["public"]["Tables"]["point_redemptions"]["Row"] & {
  reward?: PointRewardRow | null;
  user?: { id: string; display_name: string | null } | null;
};

const StatCard = ({ label, value }: { label: string; value: number | undefined }) => (
  <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-black text-slate-900">
      {value !== undefined ? value.toLocaleString() : "-"}
    </p>
  </div>
);

const pointActionLabels: Record<string, { label: string; hint: string }> = {
  diary_post: { label: "かんじょうにっき投稿", hint: "+3pt" },
  feed_comment: { label: "みんなの日記コメント", hint: "+2pt" },
  feed_share_x: { label: "Xシェア", hint: "+5pt" },
  referral_5days: { label: "紹介特典(5日)", hint: "+10pt" },
  referral_10days: { label: "紹介特典(10日)", hint: "+20pt" },
  admin_adjustment: { label: "管理者調整", hint: "任意" }
};

type DiaryEntry = {
  id: string;
  user_id: string;
  user_name: string;
  title: string | null;
  content: string;
  emotion_label: string | null;
  event_summary: string | null;
  realization: string | null;
  self_esteem_score: number | null;
  worthlessness_score: number | null;
  journal_date: string;
  created_at: string;
  is_ai_comment_public: boolean;
  is_counselor_comment_public: boolean;
  counselor_memo: string | null;
  counselor_name: string | null;
  is_visible_to_user: boolean;
  counselor_memo_read: boolean;
  assigned_counselor: string | null;
  urgency_level: string | null;
};

export function AdminClient({ userRole }: { userRole: string }) {

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<DiaryReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastRow[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState<"all" | "selected">("all");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientResults, setRecipientResults] = useState<AdminUserRow[]>([]);
  const [recipientSearching, setRecipientSearching] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<AdminUserRow[]>([]);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [aiDelayMinutes, setAiDelayMinutes] = useState(10);
  const [aiDelayOptions, setAiDelayOptions] = useState<number[]>([1, 10, 60, 1440]);
  const [aiPendingJobs, setAiPendingJobs] = useState(0);
  const [loadingAiSettings, setLoadingAiSettings] = useState(false);
  const [savingAiSettings, setSavingAiSettings] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [counselors, setCounselors] = useState<CounselorRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoForm, setMemoForm] = useState({
    counselorMemo: "",
    isVisibleToUser: false,
    assignedCounselor: "",
    urgencyLevel: ""
  });
  const [publicDiaries, setPublicDiaries] = useState<PublicDiaryEntry[]>([]);
  const [selectedDiaryComments, setSelectedDiaryComments] = useState<{
    entryId: string;
    comments: DiaryComment[];
  } | null>(null);
  const [pointRules, setPointRules] = useState<PointRule[]>([]);
  const [pointRewards, setPointRewards] = useState<PointRewardRow[]>([]);
  const [pointRedemptions, setPointRedemptions] = useState<PointRedemptionRow[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [savingPointRule, setSavingPointRule] = useState<string | null>(null);
  const [shareStats, setShareStats] = useState<{
    totalShares: number;
    xShares: number;
    usersWithTwitter: number;
    recentShares: Array<{
      id: string;
      userName: string;
      twitterUsername: string;
      platform: string;
      sharedAt: string;
    }>;
  } | null>(null);
  const [loadingShareStats, setLoadingShareStats] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    costPoints: 1000,
    stock: "",
    isActive: true
  });
  const [rewardImageFile, setRewardImageFile] = useState<File | null>(null);
  const [rewardImagePreview, setRewardImagePreview] = useState<string | null>(null);
  const [creatingReward, setCreatingReward] = useState(false);

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
      // Set default stats on error to prevent crashes
      setStats({
        users: 0,
        publicDiaries: 0,
        pendingReports: 0,
        pendingBookings: 0,
      });
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

  const loadBroadcasts = useCallback(async () => {
    setLoadingBroadcasts(true);
    try {
      const data = await fetchJson<{ broadcasts: AdminBroadcastRow[] }>("/api/admin/broadcasts");
      setBroadcasts(data.broadcasts ?? []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "配信履歴の取得に失敗しました");
    } finally {
      setLoadingBroadcasts(false);
    }
  }, []);

  const loadAiSettings = useCallback(async () => {
    setLoadingAiSettings(true);
    try {
      const data = await fetchJson<{ delayMinutes: number; options: number[]; stats: { pending: number } }>(
        "/api/admin/settings/diary-ai"
      );
      if (data.options?.length) {
        setAiDelayOptions(data.options);
      }
      if (typeof data.delayMinutes === "number") {
        setAiDelayMinutes(data.delayMinutes);
      }
      setAiPendingJobs(data.stats?.pending ?? 0);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "AI設定の取得に失敗しました");
    } finally {
      setLoadingAiSettings(false);
    }
  }, []);

  const searchRecipients = useCallback(
    async (query: string) => {
      if (!query) {
        setRecipientResults([]);
        return;
      }
      setRecipientSearching(true);
      try {
        const data = await fetchJson<{ users: AdminUserRow[] }>(`/api/admin/users?q=${encodeURIComponent(query)}`);
        setRecipientResults(data.users ?? []);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "ユーザー検索に失敗しました");
      } finally {
        setRecipientSearching(false);
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

  const loadDiaryEntries = useCallback(async () => {
    try {
      const data = await fetchJson<{ entries: DiaryEntry[] }>("/api/admin/diary/entries");
      setDiaryEntries(data.entries ?? []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadPublicDiaries = useCallback(async () => {
    try {
      const data = await fetchJson<{ entries: PublicDiaryEntry[] }>("/api/admin/feed/public");
      setPublicDiaries(data.entries ?? []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadPointOverview = useCallback(async () => {
    setLoadingPoints(true);
    try {
      const data = await fetchJson<{
        rules: PointRule[];
        rewards: PointRewardRow[];
        redemptions: PointRedemptionRow[];
      }>("/api/admin/points/overview");
      setPointRules(data.rules ?? []);
      setPointRewards(data.rewards ?? []);
      setPointRedemptions(data.redemptions ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPoints(false);
    }
  }, []);

  const loadShareStats = useCallback(async () => {
    setLoadingShareStats(true);
    try {
      const data = await fetchJson<{
        totalShares: number;
        xShares: number;
        usersWithTwitter: number;
        recentShares: Array<{
          id: string;
          userName: string;
          twitterUsername: string;
          platform: string;
          sharedAt: string;
        }>;
      }>("/api/admin/share-stats");
      setShareStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingShareStats(false);
    }
  }, []);

  const handleHideDiary = async (entryId: string) => {
    if (!confirm("この日記を非表示にしますか？")) return;
    try {
      await updateVisibility(entryId, "private");
      alert("日記を非表示にしました");
      loadPublicDiaries();
    } catch (err) {
      console.error(err);
      alert("非表示に失敗しました");
    }
  };

  const handleDeleteDiary = async (entryId: string) => {
    if (!confirm("この日記を完全に削除しますか？この操作は取り消せません。")) return;
    try {
      await fetchJson(`/api/admin/diary/entries/${entryId}`, {
        method: "DELETE"
      });
      alert("日記を削除しました");
      loadPublicDiaries();
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    }
  };

  const loadDiaryComments = async (entryId: string) => {
    try {
      const data = await fetchJson<{ comments: DiaryComment[] }>(`/api/admin/feed/${entryId}/comments`);
      setSelectedDiaryComments({ entryId, comments: data.comments ?? [] });
    } catch (err) {
      console.error(err);
      alert("コメントの取得に失敗しました");
    }
  };

  const handleDeleteComment = async (entryId: string, commentId: string) => {
    if (!confirm("このコメントを削除しますか？")) return;
    try {
      await fetchJson(`/api/admin/feed/${entryId}/comments/${commentId}`, {
        method: "DELETE"
      });
      alert("コメントを削除しました");
      loadDiaryComments(entryId);
      loadPublicDiaries();
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    }
  };

  const handleMakeCounselor = async (userId: string) => {
    if (!confirm("このユーザーをカウンセラーにしますか？")) return;
    try {
      await fetchJson(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "counselor" })
      });
      alert("カウンセラー権限を付与しました");
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "権限付与に失敗しました");
    }
  };

  const handleSaveCounselorMemo = async () => {
    if (!selectedEntry) return;
    try {
      await fetchJson(`/api/admin/diary/entries/${selectedEntry.id}/counselor-memo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memoForm)
      });
      alert("コメントを保存しました");
      setEditingMemo(false);
      loadDiaryEntries();
      setSelectedEntry(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  const handleViewEntry = (entry: DiaryEntry) => {
    setSelectedEntry(entry);
    setMemoForm({
      counselorMemo: entry.counselor_memo || "",
      isVisibleToUser: entry.is_visible_to_user || false,
      assignedCounselor: entry.assigned_counselor || "",
      urgencyLevel: entry.urgency_level || ""
    });
    setEditingMemo(false);
  };

  const handleAddRecipient = (user: AdminUserRow) => {
    setSelectedRecipients((prev) => {
      if (prev.some((item) => item.id === user.id)) {
        return prev;
      }
      return [...prev, user];
    });
  };

  const handleRemoveRecipient = (userId: string) => {
    setSelectedRecipients((prev) => prev.filter((item) => item.id !== userId));
  };

  const handleSendBroadcast = async () => {
    if (!broadcastSubject.trim()) {
      alert("件名を入力してください");
      return;
    }
    if (!broadcastBody.trim()) {
      alert("本文を入力してください");
      return;
    }
    if (broadcastAudience === "selected" && selectedRecipients.length === 0) {
      alert("配信対象のユーザーを選択してください");
      return;
    }

    setSendingBroadcast(true);
    try {
      await fetchJson(`/api/admin/broadcasts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: broadcastSubject.trim(),
          body: broadcastBody.trim(),
          audience: broadcastAudience,
          recipients: broadcastAudience === "selected" ? selectedRecipients.map((user) => user.id) : undefined
        })
      });
      setBroadcastSubject("");
      setBroadcastBody("");
      setSelectedRecipients([]);
      setRecipientResults([]);
      setRecipientQuery("");
      alert("配信を開始しました");
      loadBroadcasts();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "配信に失敗しました");
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    if (!confirm("この配信履歴を削除しますか？")) return;
    try {
      await fetchJson(`/api/admin/broadcasts/${broadcastId}`, { method: "DELETE" });
      setBroadcasts((prev) => prev.filter((item) => item.id !== broadcastId));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const handleSaveAiSettings = async () => {
    setSavingAiSettings(true);
    try {
      await fetchJson(`/api/admin/settings/diary-ai`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delayMinutes: aiDelayMinutes })
      });
      await loadAiSettings();
      alert("AIコメント設定を保存しました");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "設定の保存に失敗しました");
    } finally {
      setSavingAiSettings(false);
    }
  };

  const formatDelayLabel = (value: number) => {
    if (value === 1) return "1分後";
    if (value === 10) return "10分後";
    if (value === 60) return "1時間後";
    if (value === 1440) return "24時間後";
    if (value < 60) return `${value}分後`;
    const hours = value / 60;
    return `${hours}時間後`;
  };

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
    loadDiaryEntries();
    loadPublicDiaries();
    loadBroadcasts();
    loadAiSettings();
    loadPointOverview();
    loadShareStats();
  }, [
    loadStats,
    loadReports,
    loadUsers,
    loadNotifications,
    loadKnowledge,
    loadCourses,
    loadCounselors,
    loadAuditLogs,
    loadHealth,
    loadDiaryEntries,
    loadPublicDiaries,
    loadBroadcasts,
    loadAiSettings,
    loadPointOverview,
    loadShareStats
  ]);

  useEffect(() => {
    if (broadcastAudience !== "selected") {
      setRecipientResults([]);
      return;
    }
    const trimmed = recipientQuery.trim();
    const handle = setTimeout(() => {
      searchRecipients(trimmed);
    }, 400);
    return () => clearTimeout(handle);
  }, [recipientQuery, broadcastAudience, searchRecipients]);

  const updateVisibility = async (entryId: string, visibility: "public" | "followers" | "private") => {
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

  const handleRuleValueChange = (action: string, field: "points" | "is_active", value: number | boolean) => {
    setPointRules((prev) =>
      prev.map((rule) =>
        rule.action === action
          ? {
              ...rule,
              [field]: value
            }
          : rule
      )
    );
  };

  const handleSaveRule = async (rule: PointRule) => {
    setSavingPointRule(rule.action);
    try {
      await fetchJson(`/api/admin/points/rules/${rule.action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: rule.points, isActive: rule.is_active })
      });
      loadPointOverview();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "ポイント設定の更新に失敗しました");
    } finally {
      setSavingPointRule(null);
    }
  };

  const handleRewardImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("画像は5MB以下にしてください");
      return;
    }
    setRewardImageFile(file);
    const preview = URL.createObjectURL(file);
    setRewardImagePreview(preview);
  };

  const handleCreateReward = async () => {
    if (!rewardForm.title.trim()) {
      alert("景品名を入力してください");
      return;
    }
    setCreatingReward(true);
    try {
      let imageUrl = rewardForm.imageUrl;
      
      if (rewardImageFile) {
        const formData = new FormData();
        formData.append("image", rewardImageFile);
        const uploadRes = await fetch("/api/admin/points/rewards/upload-image", {
          method: "POST",
          body: formData
        });
        if (!uploadRes.ok) {
          throw new Error("画像のアップロードに失敗しました");
        }
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.imageUrl;
      }

      await fetchJson("/api/admin/points/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: rewardForm.title,
          description: rewardForm.description || undefined,
          imageUrl: imageUrl || undefined,
          costPoints: rewardForm.costPoints,
          stock: rewardForm.stock ? Number(rewardForm.stock) : null,
          isActive: rewardForm.isActive
        })
      });
      setRewardForm({ title: "", description: "", imageUrl: "", costPoints: 1000, stock: "", isActive: true });
      setRewardImageFile(null);
      setRewardImagePreview(null);
      loadPointOverview();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "景品の作成に失敗しました");
    } finally {
      setCreatingReward(false);
    }
  };

  const handleRewardToggle = async (rewardId: string, isActive: boolean) => {
    try {
      await fetchJson(`/api/admin/points/rewards/${rewardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive })
      });
      loadPointOverview();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "景品の更新に失敗しました");
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
        <p className="text-sm text-slate-500">テープ式心理学プラットフォーム全体の状態を確認できます。</p>
        {(userRole === "admin" || userRole === "counselor") && (
          <div className="flex gap-2 pt-2">
            <a
              href="/dashboard/counselor"
              className="inline-flex items-center rounded-full bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600"
            >
              カウンセラーダッシュボードへ →
            </a>
          </div>
        )}
      </header>

      <section className="rounded-3xl border border-slate-100 bg-white/95 p-6 shadow-xl shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-sky-500">AIコメント設定</p>
            <h2 className="text-xl font-black text-slate-900">ミシェルAIの返信タイミング</h2>
          </div>
          <div className="text-xs text-slate-500">保留中: {aiPendingJobs} 件</div>
        </div>

        {loadingAiSettings ? (
          <p className="mt-4 text-sm text-slate-500">読み込み中...</p>
        ) : (
          <>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                {aiDelayOptions.map((option) => (
                  <label
                    key={option}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{formatDelayLabel(option)}</p>
                      <p className="text-xs text-slate-500">
                        {option <= 10
                          ? "すぐに寄り添う応答"
                          : option === 1440
                            ? "翌日に落ち着いて返信"
                            : "適度な間隔で返信"}
                      </p>
                    </div>
                    <input
                      type="radio"
                      name="aiDelay"
                      value={option}
                      checked={aiDelayMinutes === option}
                      onChange={() => setAiDelayMinutes(option)}
                    />
                  </label>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">自動コメントについて</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed">
                  <li>ユーザーの日記投稿から設定時間後にミシェルがコメントを生成します。</li>
                  <li>短文や内容が判断できない日記は自動的にスキップされます。</li>
                  <li>設定変更は新しい投稿のみ対象です。</li>
                </ul>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">※ Vercel Cron 等で <code>/api/internal/cron/diary-ai-comments</code> を定期実行してください。</p>
              <Button
                onClick={handleSaveAiSettings}
                disabled={savingAiSettings}
                className="bg-sky-600 text-white hover:bg-sky-700"
              >
                {savingAiSettings ? "保存中..." : "設定を保存"}
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-blue-500">Xシェア監視</p>
            <h2 className="text-xl font-black text-slate-900">SNSシェア統計とログ</h2>
          </div>
          <button type="button" onClick={loadShareStats} className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-500">
            再読み込み
          </button>
        </div>

        {loadingShareStats ? (
          <p className="mt-4 text-sm text-slate-500">読み込み中...</p>
        ) : shareStats ? (
          <div className="mt-5 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-xs text-blue-600">総シェア回数</p>
                <p className="mt-1 text-2xl font-black text-blue-900">{shareStats.totalShares}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-xs text-blue-600">Xシェア回数</p>
                <p className="mt-1 text-2xl font-black text-blue-900">{shareStats.xShares}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-xs text-blue-600">X登録ユーザー</p>
                <p className="mt-1 text-2xl font-black text-blue-900">{shareStats.usersWithTwitter}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <h3 className="text-sm font-semibold text-slate-800">最近のシェアログ（直近20件）</h3>
              {shareStats.recentShares.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">まだシェアログがありません。</p>
              ) : (
                <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
                  {shareStats.recentShares.map((share) => (
                    <div key={share.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{share.userName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-slate-500">
                            {share.platform === "x" ? "🐦 X" : share.platform === "line" ? "💬 LINE" : "📋 Copy"}
                          </span>
                          {share.twitterUsername !== "-" && (
                            <a
                              href={`https://x.com/search?q=%23かんじょうにっき%20OR%20%23テープ式心理学%20from%3A${share.twitterUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              @{share.twitterUsername}
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(share.sharedAt).toLocaleString("ja-JP", { hour12: false })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">シェア統計の取得に失敗しました。</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-emerald-500">ポイント管理</p>
            <h2 className="text-xl font-black text-slate-900">獲得ルールと景品カタログ</h2>
          </div>
          <div className="text-xs text-slate-500">
            {loadingPoints ? "読み込み中..." : `景品 ${pointRewards.length} 件 / 交換履歴 ${pointRedemptions.length} 件`}
          </div>
        </div>

        {loadingPoints ? (
          <p className="mt-4 text-sm text-slate-500">ポイント情報を読み込んでいます...</p>
        ) : (
          <div className="mt-5 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {pointRules.map((rule) => {
                const info = pointActionLabels[rule.action] ?? { label: rule.action, hint: "" };
                return (
                  <div key={rule.action} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{info.label}</p>
                        <p className="text-xs text-slate-500">{info.hint}</p>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={rule.is_active}
                          onChange={(event) =>
                            handleRuleValueChange(rule.action, "is_active", event.target.checked)
                          }
                        />
                        有効
                      </label>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={rule.points}
                        onChange={(event) =>
                          handleRuleValueChange(rule.action, "points", Number(event.target.value) || 0)
                        }
                        className="w-24 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-800"
                      />
                      <span className="text-xs text-slate-500">pt / 回</span>
                      <Button
                        size="sm"
                        className="ml-auto bg-emerald-500 text-white hover:bg-emerald-600"
                        disabled={savingPointRule === rule.action}
                        onClick={() => handleSaveRule(rule)}
                      >
                        {savingPointRule === rule.action ? "更新中" : "更新"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">景品を追加</h3>
                <input
                  type="text"
                  placeholder="景品名"
                  value={rewardForm.title}
                  onChange={(event) => setRewardForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
                <textarea
                  placeholder="説明 (任意)"
                  value={rewardForm.description}
                  onChange={(event) => setRewardForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="h-20 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="space-y-2">
                  <label className="block text-xs text-slate-600 font-semibold">
                    景品画像 (推奨: 800×600px, 最大5MB)
                  </label>
                  {rewardImagePreview && (
                    <img src={rewardImagePreview} alt="プレビュー" className="w-32 h-24 object-cover rounded-lg border border-slate-200" />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleRewardImageChange}
                    className="w-full text-xs text-slate-600"
                  />
                  <p className="text-[11px] text-slate-400">または</p>
                  <input
                    type="url"
                    placeholder="画像URL (直接入力)"
                    value={rewardForm.imageUrl}
                    onChange={(event) => setRewardForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <label className="flex flex-col gap-1">
                    必要ポイント
                    <input
                      type="number"
                      min={1}
                      value={rewardForm.costPoints}
                      onChange={(event) => setRewardForm((prev) => ({ ...prev, costPoints: Number(event.target.value) || 0 }))}
                      className="rounded-2xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    在庫 (空欄で無制限)
                    <input
                      type="number"
                      min={0}
                      value={rewardForm.stock}
                      onChange={(event) => setRewardForm((prev) => ({ ...prev, stock: event.target.value }))}
                      className="rounded-2xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={rewardForm.isActive}
                    onChange={(event) => setRewardForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                  公開状態で追加する
                </label>
                <Button
                  onClick={handleCreateReward}
                  disabled={creatingReward}
                  className="w-full bg-tape-brown text-white hover:bg-tape-brown/90"
                >
                  {creatingReward ? "作成中..." : "景品を登録"}
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-800">公開中の景品</h3>
                {pointRewards.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">まだ登録された景品がありません。</p>
                ) : (
                  <div className="mt-3 space-y-3 text-sm">
                    {pointRewards.map((reward) => (
                      <div
                        key={reward.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{reward.title}</p>
                          <p className="text-xs text-slate-500">
                            {reward.cost_points.toLocaleString()}pt / 在庫:
                            {reward.stock === null ? "∞" : reward.stock}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${reward.is_active ? "text-emerald-500" : "text-slate-400"}`}>
                            {reward.is_active ? "公開" : "非公開"}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRewardToggle(reward.id, !reward.is_active)}
                          >
                            {reward.is_active ? "公開停止" : "公開"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-800">最近のポイント交換</h3>
              {pointRedemptions.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">まだ交換履歴がありません。</p>
              ) : (
                <div className="mt-3 space-y-2 text-xs text-slate-600">
                  {pointRedemptions.slice(0, 8).map((redeem) => (
                    <div key={redeem.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
                      <div>
                        <p className="font-semibold text-slate-800">{redeem.reward?.title ?? "景品"}</p>
                        <p>
                          {redeem.user?.display_name ?? redeem.user?.id ?? "ユーザー"} / {new Date(redeem.created_at).toLocaleString("ja-JP")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-tape-pink">-{redeem.points_spent}pt</p>
                        <p>{redeem.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-rose-500">お知らせ配信</p>
            <h2 className="text-xl font-black text-slate-900">ユーザーへのお知らせ受信箱 & メール配信</h2>
          </div>
          <div className="text-xs text-slate-500">未読: {broadcasts.length} 件</div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="件名"
              value={broadcastSubject}
              onChange={(event) => setBroadcastSubject(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            />
            <textarea
              placeholder="本文 (ユーザーにそのまま送信されます)"
              value={broadcastBody}
              onChange={(event) => setBroadcastBody(event.target.value)}
              className="h-40 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base md:text-sm"
            />

            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="broadcastAudience"
                  value="all"
                  checked={broadcastAudience === "all"}
                  onChange={() => setBroadcastAudience("all")}
                />
                全体配信 (全ユーザー)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="broadcastAudience"
                  value="selected"
                  checked={broadcastAudience === "selected"}
                  onChange={() => setBroadcastAudience("selected")}
                />
                個別配信 (ユーザー検索)
              </label>
            </div>

            {broadcastAudience === "selected" && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <input
                  type="text"
                  value={recipientQuery}
                  onChange={(event) => setRecipientQuery(event.target.value)}
                  placeholder="ユーザー名またはメールアドレスで検索"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                {recipientSearching ? (
                  <p className="text-xs text-slate-500">検索中...</p>
                ) : recipientResults.length > 0 ? (
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {recipientResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleAddRecipient(user)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-slate-300"
                      >
                        <p className="font-semibold text-slate-800">{user.displayName ?? "No Name"}</p>
                        <p className="text-[11px] text-slate-500">{user.email ?? "メール未登録"}</p>
                      </button>
                    ))}
                  </div>
                ) : recipientQuery ? (
                  <p className="text-xs text-slate-500">一致するユーザーが見つかりませんでした。</p>
                ) : null}

                {selectedRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipients.map((user) => (
                      <span
                        key={user.id}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] text-slate-700"
                      >
                        {user.displayName ?? user.email ?? user.id}
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(user.id)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="text-right">
              <Button
                onClick={handleSendBroadcast}
                disabled={sendingBroadcast}
                className="bg-rose-500 text-white hover:bg-rose-600"
              >
                {sendingBroadcast ? "送信中..." : "お知らせを配信"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">配信履歴</p>
              <button type="button" className="text-xs text-slate-500" onClick={loadBroadcasts}>
                再読み込み
              </button>
            </div>
            {loadingBroadcasts ? (
              <p className="mt-4 text-xs text-slate-500">読み込み中...</p>
            ) : broadcasts.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500">まだ配信履歴がありません。</p>
            ) : (
              <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
                {broadcasts.map((broadcast) => (
                  <article key={broadcast.id} className="rounded-xl border border-white bg-white/80 p-4 text-sm text-slate-700">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{new Date(broadcast.created_at).toLocaleString("ja-JP", { hour12: false })}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteBroadcast(broadcast.id)}
                        className="text-rose-500 hover:underline"
                      >
                        削除
                      </button>
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-900">{broadcast.subject}</p>
                    <p className="mt-1 line-clamp-3 text-xs text-slate-600 whitespace-pre-wrap">{broadcast.body}</p>
                    <div className="mt-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 mr-2">
                        {broadcast.audience === "all" ? "全体配信" : `個別 (${broadcast.target_count}人)`}
                      </span>
                      {broadcast.target_emails.length > 0 && (
                        <span>宛先例: {broadcast.target_emails.join(", ")}{broadcast.target_count > broadcast.target_emails.length ? " ほか" : ""}</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {error && <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-600">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats ? (
          <>
            <StatCard label="登録ユーザー" value={stats.users} />
            <StatCard label="みんなの日記" value={stats.publicDiaries} />
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
            <p className="text-xs font-semibold text-purple-500">日記コメント</p>
            <h2 className="text-xl font-black text-slate-900">ユーザー日記へのコメント</h2>
          </div>
          <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-500" onClick={loadDiaryEntries}>
            再読み込み
          </button>
        </div>
        <div className="mt-4 space-y-2 max-h-[600px] overflow-y-auto">
          {diaryEntries.length === 0 ? (
            <p className="text-sm text-slate-500">日記がありません。</p>
          ) : (
            diaryEntries.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-700">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>ユーザー: {entry.user_name}</span>
                  <span>{new Date(entry.journal_date).toLocaleDateString("ja-JP")}</span>
                  {entry.emotion_label && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">感情: {entry.emotion_label}</span>}
                  {entry.assigned_counselor && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">担当: {entry.assigned_counselor}</span>}
                  {entry.urgency_level && (
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        entry.urgency_level === "high"
                          ? "bg-red-100 text-red-700"
                          : entry.urgency_level === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      緊急度: {entry.urgency_level === "high" ? "高" : entry.urgency_level === "medium" ? "中" : "低"}
                    </span>
                  )}
                </div>
                {entry.title && <p className="mt-2 font-bold">{entry.title}</p>}
                <p className="mt-2 line-clamp-2 text-xs text-slate-600">{entry.content}</p>
                {entry.counselor_memo && (
                  <div className="mt-3 rounded-lg bg-yellow-50 p-3 border border-yellow-200">
                    <p className="text-xs font-bold text-yellow-900">カウンセラーコメント（{entry.counselor_name}）</p>
                    <p className="mt-1 text-xs text-yellow-800">{entry.counselor_memo}</p>
                    {entry.is_visible_to_user && <span className="inline-block mt-1 text-xs text-green-600">✓ ユーザーに表示中</span>}
                  </div>
                )}
                <button
                  onClick={() => handleViewEntry(entry)}
                  className="mt-3 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs text-purple-700 hover:bg-purple-100"
                >
                  詳細・コメント編集
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-500">通報キュー</p>
            <h2 className="text-xl font-black text-slate-900">みんなの日記の通報一覧</h2>
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
                    onClick={() => updateVisibility(report.entry!.id, "followers")}
                    disabled={!report.entry}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                  >
                    カウンセラー共有にする
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

      {userRole === "admin" && (
        <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-500">みんなの日記管理</p>
              <h2 className="text-xl font-black text-slate-900">公開日記の管理</h2>
            </div>
            <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-500" onClick={loadPublicDiaries}>
              再読み込み
            </button>
          </div>
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {publicDiaries.length === 0 ? (
              <p className="text-sm text-slate-500">公開日記がありません。</p>
            ) : (
              publicDiaries.map((diary) => (
                <article key={diary.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-slate-400">
                        ユーザー: {diary.user_name} | {new Date(diary.published_at).toLocaleString("ja-JP")}
                      </p>
                      <p className="mt-2 line-clamp-2 text-slate-700">{diary.content}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        コメント数: {diary.comments_count}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => loadDiaryComments(diary.id)}
                      className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100"
                    >
                      コメント管理
                    </button>
                    <button
                      onClick={() => handleHideDiary(diary.id)}
                      className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700 hover:bg-amber-100"
                    >
                      非表示にする
                    </button>
                    <button
                      onClick={() => handleDeleteDiary(diary.id)}
                      className="rounded-full bg-rose-500 px-3 py-1 text-xs text-white hover:bg-rose-600"
                    >
                      削除
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          {selectedDiaryComments && (
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">コメント一覧</h3>
                <button
                  onClick={() => setSelectedDiaryComments(null)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  閉じる
                </button>
              </div>
              {selectedDiaryComments.comments.length === 0 ? (
                <p className="text-xs text-slate-500">コメントがありません。</p>
              ) : (
                <div className="space-y-2">
                  {selectedDiaryComments.comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-slate-100 bg-white p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-700">{comment.commenter_name}</p>
                          <p className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleString("ja-JP")}</p>
                          <p className="mt-1 text-sm text-slate-600">{comment.content}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteComment(selectedDiaryComments.entryId, comment.id)}
                          className="ml-2 text-xs text-rose-500 hover:underline"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white/90 p-4 md:p-6 shadow-xl shadow-slate-200/70">
        <h2 className="text-xl font-black text-slate-900">ユーザー管理</h2>
        <input 
          value={userSearch} 
          onChange={(e) => { setUserSearch(e.target.value); loadUsers(e.target.value); }} 
          placeholder="名前やIDで検索" 
          className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        />
        <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
          {users.map(user => (
            <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-100 p-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{user.displayName ?? "No Name"}</p>
                <p className="text-xs text-slate-400 truncate">{user.id} / {user.role}</p>
                <p className="text-xs text-slate-500 truncate">{user.email ?? "メール未登録"}</p>
                <p className="text-xs text-slate-500">Wallet: {user.wallet?.balanceCents} JPY ({user.wallet?.status})</p>
                {user.twitterUsername && (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-blue-600">
                      X: @{user.twitterUsername} ({user.xShareCount ?? 0}回シェア)
                    </p>
                    <a
                      href={`https://x.com/search?q=%23かんじょうにっき%20OR%20%23テープ式心理学%20from%3A${user.twitterUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      投稿確認
                    </a>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {userRole === "admin" && (
                  <>
                    <button onClick={() => handleRoleChange(user.id, "admin")} className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-100">
                      Admin化
                    </button>
                    <button onClick={() => handleMakeCounselor(user.id)} className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs text-purple-600 hover:bg-purple-100">
                      カウンセラー化
                    </button>
                  </>
                )}
                <button onClick={() => handlePointAward(user.id)} className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-100">
                  ポイント付与
                </button>
                <button onClick={() => handleWalletAdjust(user.id, "credit")} className="rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs text-green-600 hover:bg-green-100">
                  残高付与
                </button>
                <button onClick={() => handleWalletStatus(user.id, user.wallet?.status === "active" ? "locked" : "active")} className="rounded-full bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100">
                  凍結/解除
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {userRole === "admin" && (
        <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-purple-500">カウンセラー管理</p>
              <h2 className="text-xl font-black text-slate-900">カウンセラープロフィール</h2>
            </div>
            <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-500" onClick={loadCounselors}>
              再読み込み
            </button>
          </div>
          <div className="space-y-3">
            {counselors.map((counselor) => (
              <div key={counselor.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{counselor.display_name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${counselor.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {counselor.is_active ? 'アクティブ' : '非アクティブ'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">slug: {counselor.slug}</p>
                    {counselor.specialties && counselor.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {counselor.specialties.map((spec: string) => (
                          <span key={spec} className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-2">予約数: {counselor.booking_count}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCounselorActive(counselor.id, !counselor.is_active)}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      {counselor.is_active ? '無効化' : '有効化'}
                    </button>
                    <a 
                      href={`/counselor/${counselor.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-500 hover:underline"
                    >
                      プロフィールを見る
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {counselors.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">カウンセラーが登録されていません。</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">
              ℹ️ カウンセラーのプロフィール編集は、各カウンセラーがログインして /dashboard/counselor から行います。
            </p>
            <p className="text-xs text-slate-500">
              新規カウンセラーを追加するには、ユーザー管理セクションで該当ユーザーを「カウンセラー化」してください。
            </p>
          </div>
        </section>
      )}

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

      {/* コース管理セクション */}
      <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
        <CourseManagement />
      </section>

      {/* 日記詳細モーダル */}

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={() => setSelectedEntry(null)}>
          <div
            className="max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-slate-900">日記詳細</h2>
              <button onClick={() => setSelectedEntry(null)} className="text-2xl text-slate-400 hover:text-slate-600">&times;</button>
            </div>

            {/* 日記内容 */}
            <div className="rounded-2xl bg-slate-50 p-4 mb-4">
              <div className="text-xs text-slate-400 mb-2">
                <span>ユーザー: {selectedEntry.user_name}</span>
                <span className="ml-4">日付: {new Date(selectedEntry.journal_date).toLocaleDateString("ja-JP")}</span>
              </div>
              {selectedEntry.title && <h3 className="text-lg font-bold mb-2">{selectedEntry.title}</h3>}
              {selectedEntry.emotion_label && (
                <p className="text-sm text-slate-600 mb-2">
                  <strong>感情:</strong> {selectedEntry.emotion_label}
                </p>
              )}
              {selectedEntry.event_summary && (
                <p className="text-sm text-slate-600 mb-2">
                  <strong>出来事:</strong> {selectedEntry.event_summary}
                </p>
              )}
              <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">{selectedEntry.content}</p>
              {selectedEntry.realization && (
                <p className="text-sm text-slate-600 mb-2">
                  <strong>気づき:</strong> {selectedEntry.realization}
                </p>
              )}
              {(selectedEntry.self_esteem_score !== null || selectedEntry.worthlessness_score !== null) && (
                <div className="text-sm text-slate-600 mt-2 flex gap-4">
                  {selectedEntry.self_esteem_score !== null && <span>自己肯定感: {selectedEntry.self_esteem_score}</span>}
                  {selectedEntry.worthlessness_score !== null && <span>無価値感: {selectedEntry.worthlessness_score}</span>}
                </div>
              )}
            </div>

            {/* カウンセラーコメント */}
            <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-yellow-900">カウンセラーコメント</h3>
                {!editingMemo && (
                  <button
                    onClick={() => setEditingMemo(true)}
                    className="rounded-full bg-purple-500 px-4 py-1 text-xs text-white hover:bg-purple-600"
                  >
                    編集
                  </button>
                )}
              </div>

              {editingMemo ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">コメント内容</label>
                    <textarea
                      value={memoForm.counselorMemo}
                      onChange={(e) => setMemoForm({ ...memoForm, counselorMemo: e.target.value })}
                      className="w-full h-32 p-3 border border-slate-200 rounded-lg text-base md:text-sm"
                      placeholder="カウンセラーコメントを入力..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isVisibleToUser"
                      checked={memoForm.isVisibleToUser}
                      onChange={(e) => setMemoForm({ ...memoForm, isVisibleToUser: e.target.checked })}
                    />
                    <label htmlFor="isVisibleToUser" className="text-sm">ユーザーに表示する</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">担当カウンセラー</label>
                    <select
                      value={memoForm.assignedCounselor}
                      onChange={(e) => setMemoForm({ ...memoForm, assignedCounselor: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="">未割り当て</option>
                      {counselors
                        .filter((c) => c.is_active)
                        .map((counselor) => (
                          <option key={counselor.id} value={counselor.display_name}>
                            {counselor.display_name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">緊急度</label>
                    <select
                      value={memoForm.urgencyLevel}
                      onChange={(e) => setMemoForm({ ...memoForm, urgencyLevel: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="">未設定</option>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingMemo(false)}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveCounselorMemo}
                      className="rounded-full bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-yellow-800 whitespace-pre-wrap">
                    {selectedEntry.counselor_memo || "（コメントはありません）"}
                  </p>
                  <div className="text-xs text-yellow-700 pt-2 border-t border-yellow-200">
                    <p><strong>担当:</strong> {selectedEntry.assigned_counselor || "未割り当て"}</p>
                    <p><strong>最終コメント者:</strong> {selectedEntry.counselor_name || "なし"}</p>
                    <p><strong>緊急度:</strong> {selectedEntry.urgency_level === "high" ? "高" : selectedEntry.urgency_level === "medium" ? "中" : selectedEntry.urgency_level === "low" ? "低" : "未設定"}</p>
                    <p><strong>ユーザー表示:</strong> {selectedEntry.is_visible_to_user ? "表示中" : "非表示"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
