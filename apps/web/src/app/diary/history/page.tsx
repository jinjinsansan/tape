"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Filter, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthGate } from "@/components/auth-gate";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@tape/supabase";
import type { DiaryVisibility } from "@tape/supabase";

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
      worthlessnessScore: entry.worthlessness_score != null ? String(entry.worthlessness_score) : ""
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
