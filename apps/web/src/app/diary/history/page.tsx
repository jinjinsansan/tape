"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Filter, Pencil, Trash2, Sparkles, Bot, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthGate } from "@/components/auth-gate";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@tape/supabase";
import type { DiaryVisibility, DiaryAiCommentStatus } from "@tape/supabase";

type DiaryEntry = {
  id: string;
  journal_date: string;
  title: string | null;
  content: string;
  event_summary: string | null;
  realization: string | null;
  emotion_label: string | null;
  self_esteem_score: number | null;
  worthlessness_score: number | null;
  visibility: DiaryVisibility;
  hasCounselorComment?: boolean;
  counselor_memo: string | null;
  counselor_name: string | null;
  is_visible_to_user: boolean;
  counselor_memo_read: boolean;
  assigned_counselor: string | null;
  urgency_level: string | null;
  ai_comment_status: DiaryAiCommentStatus;
  ai_comment: string | null;
  ai_comment_generated_at: string | null;
  ai_comment_metadata: Record<string, unknown> | null;
  is_ai_comment_public: boolean;
  is_counselor_comment_public: boolean;
};

type EditFormState = {
  title: string;
  eventSummary: string;
  content: string;
  realization: string;
  emotionLabel: string;
  visibility: DiaryVisibility;
  journalDate: string;
  selfEsteemScore: string;
  worthlessnessScore: string;
  shareAiComment: boolean;
  shareCounselorComment: boolean;
};

type EmotionOption = {
  label: string;
  tone: string;
};

const emotionOptions: EmotionOption[] = [
  { label: "恐怖", tone: "bg-purple-100 text-purple-800 border-purple-200" },
  { label: "悲しみ", tone: "bg-blue-100 text-blue-800 border-blue-200" },
  { label: "怒り", tone: "bg-red-100 text-red-800 border-red-200" },
  { label: "悔しい", tone: "bg-green-100 text-green-800 border-green-200" },
  { label: "無価値感", tone: "bg-gray-100 text-gray-800 border-gray-300" },
  { label: "罪悪感", tone: "bg-orange-100 text-orange-800 border-orange-200" },
  { label: "寂しさ", tone: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { label: "恥ずかしさ", tone: "bg-pink-100 text-pink-800 border-pink-200" },
  { label: "嬉しい", tone: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { label: "感謝", tone: "bg-teal-100 text-teal-800 border-teal-200" },
  { label: "達成感", tone: "bg-lime-100 text-lime-800 border-lime-200" },
  { label: "幸せ", tone: "bg-amber-100 text-amber-800 border-amber-200" }
];

const aiSkipReasons: Record<string, string> = {
  too_short: "短めの日記だったため、自動コメントは見送りました。",
  low_word_count: "文章量が少なかったため、自動コメントは見送りました。",
  low_variance: "内容が確認できなかったため、自動コメントは見送りました。",
  empty: "内容が空だったため、自動コメントは見送りました。"
};

const formatDateTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", { hour12: false });
};

const AiCommentBlock = ({ entry }: { entry: DiaryEntry }) => {
  if (entry.ai_comment_status === "completed" && entry.ai_comment) {
    return (
      <div className="mt-4 rounded-2xl border border-tape-pink/30 bg-[#fff6f8] p-4 text-sm">
        <p className="text-xs font-bold text-tape-pink flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> ミシェルAIからのコメント
        </p>
        <p className="mt-2 whitespace-pre-wrap text-tape-brown leading-relaxed">{entry.ai_comment}</p>
        <p className="mt-2 text-[11px] text-tape-pink">生成日時: {formatDateTime(entry.ai_comment_generated_at)}</p>
      </div>
    );
  }

  if (entry.ai_comment_status === "pending" || entry.ai_comment_status === "processing") {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-tape-pink/40 bg-white p-4 text-xs text-tape-pink flex items-center gap-2">
        <Bot className="h-4 w-4 text-tape-pink" /> ミシェルAIがコメントを準備中です。しばらくお待ちください。
      </div>
    );
  }

  if (entry.ai_comment_status === "failed") {
    return (
      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" /> ミシェルAIからのコメント生成に失敗しました。時間をおいてもう一度日記を書いてみてください。
      </div>
    );
  }

  if (entry.ai_comment_status === "skipped") {
    const reasonKey = (entry.ai_comment_metadata?.reason as string) ?? "";
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
        {aiSkipReasons[reasonKey] ?? "今回は自動コメントを見送りました。"}
      </div>
    );
  }

  return null;
};

export default function DiaryHistoryPage() {
  return (
    <AuthGate>
      <DiaryHistoryContent />
    </AuthGate>
  );
}

function DiaryHistoryContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", emotion: "", keyword: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [focusFetched, setFocusFetched] = useState(false);
  const [focusScrolling, setFocusScrolling] = useState(false);
  const [fetchingFocus, setFetchingFocus] = useState(false);

  const focusEntryId = searchParams.get("focus");

  const getAuthHeaders = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const headers: HeadersInit = {};
    if (sessionData.session?.access_token) {
      headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
    }
    return headers;
  };

  const resetEditState = () => {
    setEditingId(null);
    setEditForm(null);
    setActionError(null);
    setSavingId(null);
  };

  const startEdit = (entry: DiaryEntry) => {
    setEditingId(entry.id);
    setActionError(null);
    setEditForm({
      title: entry.title ?? "",
      eventSummary: entry.event_summary ?? "",
      content: entry.content ?? "",
      realization: entry.realization ?? "",
      emotionLabel: entry.emotion_label ?? "",
      visibility: entry.visibility,
      journalDate: entry.journal_date,
      selfEsteemScore: entry.self_esteem_score != null ? String(entry.self_esteem_score) : "",
      worthlessnessScore: entry.worthlessness_score != null ? String(entry.worthlessness_score) : "",
      shareAiComment: entry.is_ai_comment_public,
      shareCounselorComment: entry.is_counselor_comment_public
    });
  };

  const loadEntries = async (targetPage = 0, reset = true) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.emotion) params.set("emotion", filters.emotion);
      if (filters.keyword) params.set("keyword", filters.keyword);
      params.set("page", String(targetPage));
      params.set("limit", "20");

      const headers = await getAuthHeaders();

      const res = await fetch(`/api/diary/history?${params.toString()}`, {
        cache: "no-store",
        headers
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setCount(json.count ?? 0);
      setEntries((prev) => (reset ? json.entries : [...prev, ...json.entries]));
      if (reset) {
        resetEditState();
        setFocusFetched(false);
        setFocusScrolling(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "日記の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries(0, true);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to AI comment updates via Realtime
  useEffect(() => {
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const setupRealtime = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId || !isMounted) return;

      activeChannel = supabase
        .channel("diary_ai_comments")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "emotion_diary_entries",
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            const updated = payload.new as DiaryEntry;
            setEntries((prev) =>
              prev.map((entry) =>
                entry.id === updated.id
                  ? {
                      ...entry,
                      ai_comment_status: updated.ai_comment_status,
                      ai_comment: updated.ai_comment,
                      ai_comment_generated_at: updated.ai_comment_generated_at,
                      ai_comment_metadata: updated.ai_comment_metadata
                    }
                  : entry
              )
            );
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      isMounted = false;
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [supabase]);

  useEffect(() => {
    setFocusFetched(false);
    setFocusScrolling(false);
  }, [focusEntryId]);

  useEffect(() => {
    if (!focusEntryId) return;
    if (loading || fetchingFocus) return;

    const exists = entries.some((entry) => entry.id === focusEntryId);
    if (exists) {
      if (!focusScrolling) {
        const el = document.getElementById(`entry-${focusEntryId}`);
        if (el) {
          setFocusScrolling(true);
          setTimeout(() => {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
        }
      }
      return;
    }

    if (focusFetched) return;

    const fetchFocus = async () => {
      setFetchingFocus(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/diary/entries/${focusEntryId}`, {
          method: "GET",
          headers
        });
        if (res.status === 404) {
          setFocusFetched(true);
          return;
        }
        if (!res.ok) {
          throw new Error("フォーカス対象の日記取得に失敗しました");
        }
        const json = await res.json();
        setEntries((prev) => {
          if (prev.some((item) => item.id === focusEntryId)) return prev;
          return [json.entry, ...prev];
        });
        setCount((prev) => Math.max(prev, entries.length + 1));
        setFocusFetched(true);
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingFocus(false);
      }
    };

    fetchFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusEntryId, entries, loading, focusFetched, focusScrolling, fetchingFocus]);

  const handleFilter = () => {
    setPage(0);
    loadEntries(0, true);
  };

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await loadEntries(nextPage, false);
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("この日記を削除しますか？")) return;
    setDeletingId(entryId);
    setActionError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/diary/entries/${entryId}`, {
        method: "DELETE",
        headers
      });
      if (!res.ok && res.status !== 204) {
        const message = await res.text().catch(() => "削除に失敗しました");
        throw new Error(message || "削除に失敗しました");
      }

      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      setCount((prev) => Math.max(prev - 1, 0));
      if (editingId === entryId) {
        resetEditState();
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "削除に失敗しました");
      alert(err.message || "削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async (entryId: string) => {
    if (!editForm) return;

    const content = editForm.content.trim();
    if (!content) {
      setActionError("本文を入力してください");
      return;
    }

    const parseScore = (value: string) => {
      if (!value.trim()) return undefined;
      const parsed = Number(value);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
        return NaN;
      }
      return parsed;
    };

    const parsedSelfEsteem = parseScore(editForm.selfEsteemScore);
    if (parsedSelfEsteem !== undefined && Number.isNaN(parsedSelfEsteem)) {
      setActionError("自己肯定感は0〜100で入力してください");
      return;
    }

    const parsedWorthlessness = parseScore(editForm.worthlessnessScore);
    if (parsedWorthlessness !== undefined && Number.isNaN(parsedWorthlessness)) {
      setActionError("無価値感は0〜100で入力してください");
      return;
    }

    const selfEsteemEmpty = editForm.selfEsteemScore.trim() === "";
    const worthlessnessEmpty = editForm.worthlessnessScore.trim() === "";

    setSavingId(entryId);
    setActionError(null);
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(await getAuthHeaders())
      } as HeadersInit;

      const payload = {
        title: editForm.title.trim() === "" ? null : editForm.title.trim(),
        eventSummary: editForm.eventSummary.trim() === "" ? null : editForm.eventSummary.trim(),
        content,
        realization: editForm.realization.trim() === "" ? null : editForm.realization.trim(),
        emotionLabel: editForm.emotionLabel || null,
        visibility: editForm.visibility,
        journalDate: editForm.journalDate,
        isAiCommentPublic: editForm.shareAiComment,
        isCounselorCommentPublic: editForm.shareCounselorComment,
        ...(selfEsteemEmpty
          ? { selfEsteemScore: null }
          : parsedSelfEsteem !== undefined && { selfEsteemScore: parsedSelfEsteem }),
        ...(worthlessnessEmpty
          ? { worthlessnessScore: null }
          : parsedWorthlessness !== undefined && { worthlessnessScore: parsedWorthlessness })
      };

      const res = await fetch(`/api/diary/entries/${entryId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "更新に失敗しました");
      }

      const json = await res.json();
      setEntries((prev) => prev.map((entry) => (entry.id === entryId ? json.entry : entry)));
      resetEditState();
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "更新に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  const hasMore = entries.length < count;

  return (
    <div className="min-h-screen bg-tape-cream px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link href="/diary" className="text-sm text-tape-light-brown hover:text-tape-brown">
          ← かんじょうにっきトップへ戻る
        </Link>
        <Card className="border-none bg-white shadow-lg">
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center gap-2 text-tape-brown">
              <Filter className="h-5 w-5" />
              <h1 className="text-2xl font-bold">過去の日記を探す</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <label className="text-xs font-semibold text-tape-light-brown">
                開始日
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-tape-beige px-3 py-2 text-sm text-tape-brown"
                />
              </label>
              <label className="text-xs font-semibold text-tape-light-brown">
                終了日
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-tape-beige px-3 py-2 text-sm text-tape-brown"
                />
              </label>
              <label className="text-xs font-semibold text-tape-light-brown">
                感情
                <select
                  value={filters.emotion}
                  onChange={(event) => setFilters((prev) => ({ ...prev, emotion: event.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-tape-beige bg-white px-3 py-2 text-sm text-tape-brown"
                >
                  <option value="">すべて</option>
                  {emotionOptions.map((emotion) => (
                    <option key={emotion.label} value={emotion.label}>
                      {emotion.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-tape-light-brown">
                キーワード
                <input
                  type="text"
                  value={filters.keyword}
                  onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
                  placeholder="本文やタイトル"
                  className="mt-1 w-full rounded-2xl border border-tape-beige px-3 py-2 text-sm text-tape-brown"
                />
              </label>
            </div>
            <Button onClick={handleFilter} disabled={loading} className="inline-flex items-center gap-2 self-start bg-tape-brown hover:bg-tape-brown/90">
              <Search className="h-4 w-4" /> 検索
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id} id={`entry-${entry.id}`} className="border-none bg-white shadow-sm">
              <CardContent className="space-y-3 p-6">
                <div className="flex flex-wrap items-center gap-3 text-xs text-tape-light-brown">
                  <span>{entry.journal_date}</span>
                  {entry.emotion_label && (
                    <span className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      emotionOptions.find((opt) => opt.label === entry.emotion_label)?.tone ?? "bg-tape-pink/10 text-tape-pink"
                    )}>
                      {entry.emotion_label}
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      entry.visibility === "public"
                        ? "bg-tape-green/20 text-tape-brown"
                        : entry.visibility === "followers"
                        ? "bg-tape-orange/20 text-tape-brown"
                        : "bg-tape-beige text-tape-brown"
                    )}
                  >
                    {entry.visibility === "public"
                      ? "みんなの日記"
                      : entry.visibility === "followers"
                      ? "公開（カウンセラー共有）"
                      : "非公開（下書き）"}
                  </span>
                  {entry.hasCounselorComment && (
                    <span className="rounded-full bg-tape-green/10 px-3 py-1 text-xs font-semibold text-tape-brown">
                      カウンセラーコメントあり
                    </span>
                  )}
                  <div className="ml-auto flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(entry)}
                      disabled={savingId === entry.id || deletingId === entry.id}
                    >
                      <Pencil className="mr-1 h-4 w-4" /> 編集
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id || savingId === entry.id}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> 削除
                    </Button>
                  </div>
                </div>

                {editingId === entry.id && editForm ? (
                  <div className="space-y-4 rounded-2xl border border-tape-beige bg-tape-cream/50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-xs font-semibold text-tape-light-brown">
                        タイトル
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(event) => setEditForm((prev) => prev && { ...prev, title: event.target.value })}
                          className="mt-1 w-full rounded-2xl border border-tape-beige px-3 py-2 text-sm text-tape-brown"
                          placeholder="(タイトルなし)"
                        />
                      </label>
                      <label className="text-xs font-semibold text-tape-light-brown">
                        記入日
                        <input
                          type="date"
                          value={editForm.journalDate}
                          onChange={(event) => setEditForm((prev) => prev && { ...prev, journalDate: event.target.value })}
                          className="mt-1 w-full rounded-2xl border border-tape-beige px-3 py-2 text-sm text-tape-brown"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-xs font-semibold text-tape-light-brown">
                        感情
                        <select
                          value={editForm.emotionLabel}
                          onChange={(event) => setEditForm((prev) => prev && { ...prev, emotionLabel: event.target.value })}
                          className="mt-1 w-full rounded-2xl border border-tape-beige bg-white px-3 py-2 text-sm text-tape-brown"
                        >
                          <option value="">選択しない</option>
                          {emotionOptions.map((emotion) => (
                            <option key={emotion.label} value={emotion.label}>
                              {emotion.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-tape-light-brown">
                        公開設定
                        <select
                          value={editForm.visibility}
                          onChange={(event) =>
                            setEditForm((prev) => prev && { ...prev, visibility: event.target.value as DiaryVisibility })
                          }
                          className="mt-1 w-full rounded-2xl border border-tape-beige bg-white px-3 py-2 text-sm text-tape-brown"
                        >
                          <option value="private">非公開（下書き）</option>
                          <option value="followers">公開（カウンセラー共有）</option>
                          <option value="public">みんなの日記</option>
                        </select>
                      </label>
                    </div>

                    <div className="rounded-2xl border border-tape-beige bg-white/70 p-4 text-xs text-tape-brown">
                      <p className="font-semibold text-tape-light-brown">コメント公開設定</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <label className="flex items-center justify-between gap-3">
                          <span>ミシェルAIのコメントを公開</span>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-tape-beige"
                            checked={editForm.shareAiComment}
                            disabled={editForm.visibility !== "public"}
                            onChange={(event) =>
                              setEditForm((prev) => prev && { ...prev, shareAiComment: event.target.checked })
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between gap-3">
                          <span>カウンセラーのコメントを公開</span>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-tape-beige"
                            checked={editForm.shareCounselorComment}
                            disabled={editForm.visibility !== "public"}
                            onChange={(event) =>
                              setEditForm((prev) => prev && { ...prev, shareCounselorComment: event.target.checked })
                            }
                          />
                        </label>
                      </div>
                      {editForm.visibility !== "public" && (
                        <p className="mt-2 text-[11px] text-tape-light-brown">
                          「みんなの日記」に公開したときのみ表示されます。
                        </p>
                      )}
                    </div>

                    <label className="text-xs font-semibold text-tape-light-brown">
                      出来事・状況
                      <textarea
                        value={editForm.eventSummary}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, eventSummary: event.target.value })}
                        placeholder="印象に残った出来事を具体的に"
                        className="mt-1 h-20 w-full rounded-2xl border border-tape-beige bg-white px-3 py-2 text-base md:text-sm text-tape-brown"
                      />
                    </label>

                    <label className="text-xs font-semibold text-tape-light-brown">
                      本文
                      <textarea
                        value={editForm.content}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, content: event.target.value })}
                        className="mt-1 h-32 w-full rounded-2xl border border-tape-beige bg-tape-cream/60 px-3 py-2 text-base md:text-sm text-tape-brown"
                      />
                    </label>

                    <label className="text-xs font-semibold text-tape-light-brown">
                      気づき
                      <textarea
                        value={editForm.realization}
                        onChange={(event) => setEditForm((prev) => prev && { ...prev, realization: event.target.value })}
                        className="mt-1 h-20 w-full rounded-2xl border border-dashed border-tape-beige bg-white px-3 py-2 text-base md:text-sm text-tape-brown"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-tape-light-brown">
                        自己肯定感 (0-100)
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editForm.selfEsteemScore}
                          onChange={(event) =>
                            setEditForm((prev) => prev && { ...prev, selfEsteemScore: event.target.value })
                          }
                          className="mt-1 w-full rounded-2xl border border-tape-beige px-3 py-2 text-sm text-tape-brown"
                          placeholder="未入力"
                        />
                      </label>
                      <label className="text-xs font-semibold text-tape-light-brown">
                        無価値感 (0-100)
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editForm.worthlessnessScore}
                          onChange={(event) =>
                            setEditForm((prev) => prev && { ...prev, worthlessnessScore: event.target.value })
                          }
                          className="mt-1 w-full rounded-2xl border border-tape-beige px-3 py-2 text-sm text-tape-brown"
                          placeholder="未入力"
                        />
                      </label>
                    </div>

                    {actionError && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                        {actionError}
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetEditState}
                        disabled={savingId === entry.id}
                      >
                        キャンセル
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(entry.id)}
                        disabled={savingId === entry.id}
                      >
                        {savingId === entry.id ? "保存中..." : "保存"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-tape-brown">{entry.title ?? "(タイトルなし)"}</h3>
                    {entry.event_summary && (
                      <div className="rounded-2xl border border-tape-beige bg-tape-cream/40 p-3 text-sm">
                        <p className="text-xs font-semibold text-tape-light-brown">出来事</p>
                        <p className="mt-1 whitespace-pre-wrap text-tape-brown">{entry.event_summary}</p>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm text-tape-brown/90">{entry.content}</p>
                    {entry.realization && (
                      <div className="rounded-2xl border border-dashed border-tape-beige p-3 text-sm text-tape-brown">
                        <p className="text-xs font-semibold text-tape-light-brown">気づき</p>
                        <p className="mt-1 whitespace-pre-wrap">{entry.realization}</p>
                      </div>
                    )}
                    {(entry.self_esteem_score != null || entry.worthlessness_score != null) && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-tape-beige bg-white/60 p-3">
                          <p className="text-xs font-semibold text-tape-light-brown">自己肯定感</p>
                          <p className="mt-1 text-sm font-semibold text-tape-brown">{entry.self_esteem_score ?? "-"}</p>
                        </div>
                        <div className="rounded-2xl border border-tape-beige bg-white/60 p-3">
                          <p className="text-xs font-semibold text-tape-light-brown">無価値感</p>
                          <p className="mt-1 text-sm font-semibold text-tape-brown">{entry.worthlessness_score ?? "-"}</p>
                        </div>
                      </div>
                    )}
                    {entry.is_visible_to_user && entry.counselor_memo && entry.counselor_name && (
                      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm">
                        <p className="text-xs font-bold text-yellow-900 flex items-center gap-2">
                          <span>💬</span> カウンセラーからのコメント
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-yellow-800">{entry.counselor_memo}</p>
                        <p className="mt-2 text-xs text-yellow-700">— {entry.counselor_name}</p>
                      </div>
                    )}
                    <AiCommentBlock entry={entry} />
                  </>
                )}
              </CardContent>
            </Card>
          ))}
          {entries.length === 0 && !loading && (
            <p className="rounded-2xl border border-dashed border-tape-beige bg-white/60 px-4 py-6 text-center text-sm text-tape-light-brown">
              条件に一致する日記がまだありません。
            </p>
          )}
          {hasMore && (
            <Button onClick={handleLoadMore} disabled={loading} variant="outline" className="w-full border-tape-brown text-tape-brown">
              さらに読み込む
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
