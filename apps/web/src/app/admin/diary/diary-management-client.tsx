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

  const loadEntries = useCallback(async () => {
    setLoading(true);
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
    } catch (err) {
      console.error(err);
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [visibility]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

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
        return "bg-red-100 text-red-700 border-red-300";
      case "urgent":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "attention":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "";
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
                        {entry.urgency_level}
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
                        カウンセラーメモあり
                      </div>
                    )}
                  </div>
                </div>

                {/* アクション */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => setSelectedEntry(entry)}
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
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedEntry.title || "無題の日記"}
                  </h2>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <User className="h-4 w-4" />
                    {selectedEntry.user_name}
                    {selectedEntry.user_email && ` (${selectedEntry.user_email})`}
                  </div>
                </div>
                <Button
                  onClick={() => setSelectedEntry(null)}
                  variant="ghost"
                  size="sm"
                >
                  閉じる
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-semibold text-slate-700">日付</div>
                  <div className="text-slate-900">{formatDate(selectedEntry.journal_date)}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-700">内容</div>
                  <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-slate-900">
                    {selectedEntry.content}
                  </div>
                </div>

                {selectedEntry.emotion_label && (
                  <div>
                    <div className="text-sm font-semibold text-slate-700">感情</div>
                    <div className="text-slate-900">{selectedEntry.emotion_label}</div>
                  </div>
                )}

                {selectedEntry.mood_label && (
                  <div>
                    <div className="text-sm font-semibold text-slate-700">気分</div>
                    <div className="text-slate-900">{selectedEntry.mood_label}</div>
                  </div>
                )}

                {selectedEntry.counselor_memo && (
                  <div>
                    <div className="text-sm font-semibold text-amber-700">カウンセラーメモ</div>
                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-amber-50 p-4 text-slate-900">
                      {selectedEntry.counselor_memo}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-semibold text-slate-700">公開設定</div>
                  <div
                    className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-semibold ${visibilityColor(
                      selectedEntry.visibility
                    )}`}
                  >
                    {visibilityLabel(selectedEntry.visibility)}
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
