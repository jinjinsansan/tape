"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Eye, MessageCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";

type FeedEntry = {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  published_at: string | null;
  visibility: string;
  comments_count: number;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export function FeedManagementClient() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<FeedEntry | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{ entries: FeedEntry[] }>(
        `/api/admin/feed/public`
      );
      setEntries(data.entries || []);
    } catch (err) {
      console.error(err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "未公開";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
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
      {/* 統計 */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-500">
          公開日記：<span className="font-semibold text-slate-900">{entries.length}件</span>
        </div>
      </div>

      {/* 日記一覧 */}
      <div className="grid gap-4">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">公開日記が見つかりません</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* ヘッダー */}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">
                      {entry.user_name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(entry.published_at)}
                    </span>
                  </div>

                  {/* コンテンツプレビュー */}
                  <p className="line-clamp-3 text-sm text-slate-600">
                    {entry.content}
                  </p>

                  {/* メタ情報 */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {entry.comments_count}件のコメント
                    </div>
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
                  <h2 className="text-2xl font-bold text-slate-900">公開日記</h2>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <User className="h-4 w-4" />
                    {selectedEntry.user_name}
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
                  <div className="text-sm font-semibold text-slate-700">公開日時</div>
                  <div className="text-slate-900">{formatDate(selectedEntry.published_at)}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-700">内容</div>
                  <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-slate-900">
                    {selectedEntry.content}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-700">コメント数</div>
                  <div className="text-slate-900">{selectedEntry.comments_count}件</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
