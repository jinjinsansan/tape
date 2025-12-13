"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Eye, MessageCircle, Calendar, User, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

type DiaryEntry = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  title: string | null;
  content: string;
  journal_date: string;
  published_at: string | null;
  visibility: "public" | "followers" | "private";
  mood_label: string | null;
  emotion_label: string | null;
  created_at: string;
  comments_count: number;
  ai_comment_status: string;
  counselor_memo: string | null;
  urgency_level: string | null;
  counselor_name: string | null;
  is_visible_to_user: boolean;
  assigned_counselor: string | null;
  counselor_memo_read: boolean;
  is_counselor_comment_public: boolean;
  is_ai_comment_public: boolean;
};

type CounselorOption = {
  id: string;
  display_name: string | null;
  is_active: boolean;
};

type MemoFormState = {
  counselorMemo: string;
  isVisibleToUser: boolean;
  assignedCounselor: string;
  urgencyLevel: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export function DiaryManagementClient() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);

  const [memoForm, setMemoForm] = useState<MemoFormState>({
    counselorMemo: "",
    isVisibleToUser: false,
    assignedCounselor: "",
    urgencyLevel: ""
  });
  const [counselors, setCounselors] = useState<CounselorOption[]>([]);
  const [savingMemo, setSavingMemo] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);

  const resetMemoForm = () => {
    setMemoForm({
      counselorMemo: "",
      isVisibleToUser: false,
      assignedCounselor: "",
      urgencyLevel: ""
    });
  };

  const loadEntries = useCallback(async (options?: { silent?: boolean }): Promise<DiaryEntry[]> => {
    const showSpinner = !options?.silent;
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (visibility !== "all") {
        params.set("visibility", visibility);
      }
      params.set("limit", "100");

      const data = await fetchJson<{ entries: DiaryEntry[]; total: number }>(
        `/api/admin/diary/entries?${params.toString()}`
      );
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      return data.entries || [];
    } catch (err) {
      console.error(err);
      setEntries([]);
      setTotal(0);
      return [] as DiaryEntry[];
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, [visibility]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    const loadCounselors = async () => {
      try {
        const data = await fetchJson<{ counselors: CounselorOption[] }>("/api/admin/counselors");
        setCounselors(data.counselors || []);
      } catch (err) {
        console.error(err);
      }
    };

    loadCounselors();
  }, []);

  const visibilityLabel = (vis: string) => {
    switch (vis) {
      case "public":
        return "公開";
      case "followers":
        return "フォロワー";
      case "private":
        return "非公開";
      default:
        return vis;
    }
  };

  const visibilityColor = (vis: string) => {
    switch (vis) {
      case "public":
        return "bg-green-100 text-green-700";
      case "followers":
        return "bg-blue-100 text-blue-700";
      case "private":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const urgencyColor = (level: string | null) => {
    switch (level) {
      case "critical":
      case "high":
        return "bg-red-100 text-red-700 border-red-300";
      case "urgent":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "attention":
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "low":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "";
    }
  };

  const urgencyLabel = (level: string | null) => {
    switch (level) {
      case "critical":
      case "high":
        return "高";
      case "urgent":
        return "緊急";
      case "attention":
      case "medium":
        return "注意";
      case "low":
        return "低";
      default:
        return "未設定";
    }
  };

  const handleSelectEntry = (entry: DiaryEntry) => {
    setSelectedEntry(entry);
    setMemoForm({
      counselorMemo: entry.counselor_memo || "",
      isVisibleToUser: entry.is_visible_to_user ?? false,
      assignedCounselor: entry.assigned_counselor || "",
      urgencyLevel: entry.urgency_level || ""
    });
  };

  const handleCloseEntry = () => {
    setSelectedEntry(null);
    resetMemoForm();
  };

  const handleSaveMemo = async () => {
    if (!selectedEntry) return;
    setSavingMemo(true);
    try {
      await fetchJson(`/api/admin/diary/entries/${selectedEntry.id}/counselor-memo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memoForm)
      });
      alert("コメントを保存しました");
      await loadEntries({ silent: true });
      handleCloseEntry();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "コメントの保存に失敗しました");
    } finally {
      setSavingMemo(false);
    }
  };

  const handleVisibilityChange = async (newVisibility: "public" | "followers" | "private") => {
    if (!selectedEntry || selectedEntry.visibility === newVisibility) return;
    setUpdatingVisibility(true);
    try {
      await fetchJson(`/api/admin/diary/entries/${selectedEntry.id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVisibility })
      });
      alert("公開設定を更新しました");
      const updatedEntries = await loadEntries({ silent: true });
      const refreshed = updatedEntries.find((entry) => entry.id === selectedEntry.id);
      if (refreshed) {
        setSelectedEntry(refreshed);
      } else {
        handleCloseEntry();
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "公開設定の更新に失敗しました");
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* フィルター */}
      <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <Filter className="h-5 w-5 text-slate-400" />
        <div className="flex gap-2">
          <Button
            onClick={() => setVisibility("all")}
            variant={visibility === "all" ? "default" : "outline"}
            size="sm"
          >
            すべて
          </Button>
          <Button
            onClick={() => setVisibility("public")}
            variant={visibility === "public" ? "default" : "outline"}
            size="sm"
          >
            公開
          </Button>
          <Button
            onClick={() => setVisibility("private")}
            variant={visibility === "private" ? "default" : "outline"}
            size="sm"
          >
            非公開
          </Button>
        </div>
        <div className="ml-auto text-sm text-slate-500">
          {total}件の日記
        </div>
      </div>

      {/* 日記一覧 */}
      <div className="grid gap-4">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">日記が見つかりません</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-lg border bg-white p-6 transition-shadow hover:shadow-md ${
                urgencyColor(entry.urgency_level)
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* ヘッダー */}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">
                      {entry.user_name}
                    </span>
                    {entry.user_email && (
                      <span className="text-xs text-slate-500">
                        ({entry.user_email})
                      </span>
                    )}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${visibilityColor(
                        entry.visibility
                      )}`}
                    >
                      {visibilityLabel(entry.visibility)}
                    </span>
                    {entry.urgency_level && entry.urgency_level !== "normal" && (
                      <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        緊急度: {urgencyLabel(entry.urgency_level)}
                      </span>
                    )}
                  </div>

                  {/* タイトル */}
                  {entry.title && (
                    <h3 className="text-lg font-semibold text-slate-900">
                      {entry.title}
                    </h3>
                  )}

                  {/* コンテンツプレビュー */}
                  <p className="line-clamp-2 text-sm text-slate-600">
                    {entry.content}
                  </p>

                  {/* メタ情報 */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(entry.journal_date)}
                    </div>
                    {entry.emotion_label && (
                      <div className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">
                        {entry.emotion_label}
                      </div>
                    )}
                    {entry.assigned_counselor && (
                      <div className="rounded-full bg-purple-50 px-2 py-0.5 text-purple-700">
                        担当: {entry.assigned_counselor}
                      </div>
                    )}
                    {entry.mood_label && (
                      <div className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                        {entry.mood_label}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {entry.comments_count}件のコメント
                    </div>
                    {entry.counselor_memo && (
                      <div className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                        カウンセラーメモあり{entry.is_visible_to_user ? "（ユーザーに公開中）" : ""}
                      </div>
                    )}
                  </div>
                </div>

                {/* アクション */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleSelectEntry(entry)}
                    size="sm"
                    variant="outline"
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    詳細
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCloseEntry}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <User className="h-4 w-4" />
                    {selectedEntry.user_name}
                    {selectedEntry.user_email && ` (${selectedEntry.user_email})`}
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    {selectedEntry.title || "無題の日記"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    記録日: {formatDate(selectedEntry.journal_date)} / 投稿: {new Date(selectedEntry.created_at).toLocaleString("ja-JP")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.urgency_level && selectedEntry.urgency_level !== "normal" && (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                      緊急度: {urgencyLabel(selectedEntry.urgency_level)}
                    </span>
                  )}
                  <Button onClick={handleCloseEntry} variant="ghost" size="sm">
                    閉じる
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="text-sm font-semibold text-slate-700">公開設定</div>
                    <div
                      className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold ${visibilityColor(
                        selectedEntry.visibility
                      )}`}
                    >
                      {visibilityLabel(selectedEntry.visibility)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        { value: "public", label: "公開" },
                        { value: "followers", label: "カウンセラー共有" },
                        { value: "private", label: "非公開" }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          size="sm"
                          variant={selectedEntry.visibility === option.value ? "default" : "outline"}
                          onClick={() => handleVisibilityChange(option.value as "public" | "followers" | "private")}
                          disabled={updatingVisibility}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-700">感情・メモ</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {selectedEntry.emotion_label && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">
                          感情: {selectedEntry.emotion_label}
                        </span>
                      )}
                      {selectedEntry.mood_label && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                          気分: {selectedEntry.mood_label}
                        </span>
                      )}
                      {selectedEntry.assigned_counselor && (
                        <span className="rounded-full bg-pink-100 px-2 py-0.5 text-pink-700">
                          担当: {selectedEntry.assigned_counselor}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 text-sm text-slate-600">
                      コメント数: {selectedEntry.comments_count}件 / AIコメント: {selectedEntry.ai_comment_status}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-700">内容</div>
                    <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-slate-900">
                      {selectedEntry.content}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-amber-800">カウンセラーコメント</p>
                        {selectedEntry.counselor_name && (
                          <p className="text-xs text-amber-700">前回担当: {selectedEntry.counselor_name}</p>
                        )}
                      </div>
                      {selectedEntry.is_visible_to_user && (
                        <span className="text-xs font-semibold text-green-600">ユーザーに公開中</span>
                      )}
                    </div>
                    <textarea
                      value={memoForm.counselorMemo}
                      onChange={(e) => setMemoForm((prev) => ({ ...prev, counselorMemo: e.target.value }))}
                      className="mt-3 h-32 w-full rounded-lg border border-amber-200 bg-white/80 p-3 text-sm text-slate-900"
                      placeholder="カウンセラーコメントを入力"
                    />
                    <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={memoForm.isVisibleToUser}
                        onChange={(e) => setMemoForm((prev) => ({ ...prev, isVisibleToUser: e.target.checked }))}
                      />
                      ユーザーに表示する
                    </label>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <div>
                        <p className="mb-1 font-semibold">担当カウンセラー</p>
                        <select
                          value={memoForm.assignedCounselor}
                          onChange={(e) => setMemoForm((prev) => ({ ...prev, assignedCounselor: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 p-2"
                        >
                          <option value="">未割り当て</option>
                          {counselors
                            .filter((counselor) => counselor.is_active)
                            .map((counselor) => (
                              <option key={counselor.id} value={counselor.display_name || counselor.id}>
                                {counselor.display_name || "名称未設定"}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <p className="mb-1 font-semibold">緊急度</p>
                        <select
                          value={memoForm.urgencyLevel}
                          onChange={(e) => setMemoForm((prev) => ({ ...prev, urgencyLevel: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 p-2"
                        >
                          <option value="">未設定</option>
                          <option value="low">低</option>
                          <option value="medium">中</option>
                          <option value="high">高</option>
                          <option value="attention">注意</option>
                          <option value="urgent">緊急</option>
                          <option value="critical">最重要</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button onClick={handleSaveMemo} disabled={savingMemo} className="flex-1 bg-purple-600 text-white hover:bg-purple-700">
                        {savingMemo ? "保存中..." : "コメントを保存"}
                      </Button>
                      <Button variant="outline" onClick={handleCloseEntry}>
                        キャンセル
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
