"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  visibility: string;
};

const emotionOptions = [
  "恐怖",
  "悲しみ",
  "怒り",
  "寂しさ",
  "無価値感",
  "罪悪感",
  "悔しさ",
  "恥ずかしさ",
  "嬉しい",
  "感謝",
  "達成感",
  "幸せ"
];

export default function DiaryHistoryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", emotion: "", keyword: "" });

  const loadEntries = async (targetPage = 0, reset = true) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.emotion) params.set("emotion", filters.emotion);
      if (filters.keyword) params.set("keyword", filters.keyword);
      params.set("page", String(targetPage));
      params.set("limit", "20");

      const res = await fetch(`/api/diary/history?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load history");
      }
      const data = await res.json();
      setCount(data.count ?? 0);
      setEntries((prev) => (reset ? data.entries : [...prev, ...data.entries]));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries(0, true);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = () => {
    setPage(0);
    loadEntries(0, true);
  };

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await loadEntries(nextPage, false);
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
                    <option key={emotion} value={emotion}>
                      {emotion}
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

        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id} className="border-none bg-white shadow-sm">
              <CardContent className="space-y-3 p-6">
                <div className="flex flex-wrap items-center gap-3 text-xs text-tape-light-brown">
                  <span>{entry.journal_date}</span>
                  {entry.emotion_label && (
                    <span className="rounded-full bg-tape-pink/10 px-3 py-1 text-xs font-semibold text-tape-pink">
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
                    {entry.visibility === "public" ? "全体公開" : entry.visibility === "followers" ? "ゆる公開" : "非公開"}
                  </span>
                </div>
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
