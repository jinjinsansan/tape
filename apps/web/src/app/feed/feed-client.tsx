"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Flag, MessageCircle } from "lucide-react";

type FeedEntry = {
  id: string;
  content: string;
  publishedAt: string;
  journalDate: string;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  moodScore: number | null;
  moodLabel: string | null;
  moodColor: string | null;
  feelings: { label: string; intensity: number }[];
  reactions: {
    counts: Record<string, number>;
    viewerReaction: string | null;
    total: number;
  };
};

type FeedResponse = {
  entries: FeedEntry[];
  nextCursor: string | null;
};

const reactionOptions = [
  { id: "cheer", label: "👏" },
  { id: "hug", label: "🤗" },
  { id: "empathy", label: "💞" },
  { id: "insight", label: "💡" },
  { id: "support", label: "🤝" }
];

export function FeedPageClient() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [composerContent, setComposerContent] = useState("今日の気持ちを書いてみませんか？");
  const [composerVisibility, setComposerVisibility] = useState<"public" | "followers" | "private">("public");
  const [composerSubmitting, setComposerSubmitting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  const fetchFeed = useCallback(
    async (mode: "initial" | "append") => {
      if (mode === "append" && (!hasMore || loadingMore)) {
        return;
      }
      mode === "initial" ? setLoading(true) : setLoadingMore(true);
      try {
        const params = new URLSearchParams();
        if (mode === "append" && cursor) {
          params.set("cursor", cursor);
        }
        const res = await fetch(`/api/feed?${params.toString()}`);
        if (!res.ok) {
          throw new Error("フィードの取得に失敗しました");
        }
        const data = (await res.json()) as FeedResponse;
        setEntries((prev) => (mode === "append" ? [...prev, ...data.entries] : data.entries));
        setCursor(data.nextCursor);
        setHasMore(Boolean(data.nextCursor));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "フィードの取得に失敗しました");
      } finally {
        mode === "initial" ? setLoading(false) : setLoadingMore(false);
      }
    },
    [cursor, hasMore, loadingMore]
  );

  useEffect(() => {
    fetchFeed("initial");
  }, [fetchFeed]);

  const handleReactionToggle = async (entryId: string, reactionId: string) => {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    const isSameReaction = entry.reactions.viewerReaction === reactionId;
    const method = isSameReaction ? "DELETE" : "POST";
    const body = isSameReaction ? undefined : JSON.stringify({ reactionType: reactionId });

    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== entryId) return item;
        const counts = { ...item.reactions.counts };
        let viewerReaction = item.reactions.viewerReaction;
        if (isSameReaction) {
          if (viewerReaction) {
            counts[viewerReaction] = Math.max((counts[viewerReaction] ?? 1) - 1, 0);
            if (counts[viewerReaction] === 0) delete counts[viewerReaction];
          }
          viewerReaction = null;
        } else {
          if (viewerReaction && counts[viewerReaction]) {
            counts[viewerReaction] = Math.max(counts[viewerReaction] - 1, 0);
            if (counts[viewerReaction] === 0) delete counts[viewerReaction];
          }
          counts[reactionId] = (counts[reactionId] ?? 0) + 1;
          viewerReaction = reactionId;
        }
        const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
        return { ...item, reactions: { counts, viewerReaction, total } };
      })
    );

    try {
      const res = await fetch(`/api/feed/${entryId}/reactions`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body
      });
      if (!res.ok) {
        throw new Error("リアクションの更新に失敗しました");
      }
    } catch (err) {
      console.error(err);
      fetchFeed("initial");
    }
  };

  const handleReport = async (entryId: string) => {
    const reason = prompt("問題がある内容を報告できます。理由を入力してください。", "スパムの可能性があるため");
    if (!reason) return;
    try {
      const res = await fetch(`/api/feed/${entryId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) {
        throw new Error("報告に失敗しました");
      }
      alert("ご報告ありがとうございます。モデレーターが確認します。");
    } catch (err) {
      console.error(err);
      alert("報告に失敗しました。");
    }
  };

  const timeline = useMemo(() => entries, [entries]);

  const handleComposerSubmit = async () => {
    if (!composerContent.trim()) {
      setComposerError("内容を入力してください");
      return;
    }
    setComposerSubmitting(true);
    setComposerError(null);
    try {
      const res = await fetch("/api/diary/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: composerContent.trim(), visibility: composerVisibility })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "投稿に失敗しました");
      }
      setComposerContent("");
      fetchFeed("initial");
    } catch (err) {
      console.error(err);
      setComposerError(err instanceof Error ? err.message : "投稿に失敗しました");
    } finally {
      setComposerSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-tape-beige shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm font-bold text-tape-brown">いまの気持ちを記録</p>
          <textarea
            value={composerContent}
            onChange={(event) => setComposerContent(event.target.value)}
            className="mt-3 h-24 w-full rounded-2xl border border-tape-beige bg-tape-cream/50 px-4 py-3 text-sm text-tape-brown focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink resize-none"
            placeholder="共有したい日記を入力してください"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-tape-light-brown">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="feed-visibility"
                checked={composerVisibility === "public"}
                onChange={() => setComposerVisibility("public")}
                className="accent-tape-pink"
              />
              みんなの日記に公開 (フィード掲載)
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="feed-visibility"
                checked={composerVisibility === "followers"}
                onChange={() => setComposerVisibility("followers")}
                className="accent-tape-pink"
              />
              公開（カウンセラー共有）
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="feed-visibility"
                checked={composerVisibility === "private"}
                onChange={() => setComposerVisibility("private")}
                className="accent-tape-pink"
              />
              非公開（下書き）
            </label>
            <Button
              onClick={handleComposerSubmit}
              disabled={composerSubmitting}
              className="ml-auto bg-tape-pink text-tape-brown hover:bg-tape-pink/90"
              size="sm"
            >
              {composerSubmitting ? "投稿中..." : "投稿"}
            </Button>
          </div>
          {composerError && <p className="mt-2 text-xs text-tape-pink">{composerError}</p>}
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border-tape-beige bg-white/80">
          <CardContent className="p-10 text-center text-sm text-tape-light-brown">読み込み中...</CardContent>
        </Card>
      ) : error ? (
        <Card className="border-tape-pink/20 bg-tape-pink/5">
          <CardContent className="p-10 text-center text-sm text-tape-pink">{error}</CardContent>
        </Card>
      ) : timeline.length === 0 ? (
        <Card className="border-tape-beige bg-white/80">
          <CardContent className="p-10 text-center text-sm text-tape-light-brown">まだ「みんなの日記」への投稿がありません。</CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {timeline.map((entry) => (
            <Card key={entry.id} className="border-tape-beige bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <img src={entry.author.avatarUrl ?? "https://placehold.co/48x48/F5F2EA/5C554F?text=User"} alt={entry.author.displayName ?? "匿名"} className="h-10 w-10 rounded-full object-cover border border-tape-beige" />
                  <div>
                    <p className="text-sm font-bold text-tape-brown">{entry.author.displayName ?? "匿名ユーザー"}</p>
                    <p className="text-xs text-tape-light-brown">{new Date(entry.publishedAt ?? entry.journalDate).toLocaleString("ja-JP")}</p>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-tape-brown/90">{entry.content}</p>
                {entry.feelings.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {entry.feelings.map((feeling) => (
                      <span key={`${entry.id}-${feeling.label}`} className="rounded-full bg-tape-pink/10 px-3 py-1 text-tape-brown">
                        {feeling.label}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                  {reactionOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleReactionToggle(entry.id, option.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-all",
                        entry.reactions.viewerReaction === option.id
                          ? "border-tape-pink bg-tape-pink/20 text-tape-brown"
                          : "border-tape-beige text-tape-light-brown hover:bg-tape-cream"
                      )}
                    >
                      {option.label} {entry.reactions.counts[option.id] ? ` ${entry.reactions.counts[option.id]}` : ""}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleReport(entry.id)}
                    className="ml-auto text-tape-light-brown hover:text-tape-pink"
                    title="通報"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
          {hasMore && (
            <Button
              onClick={() => fetchFeed("append")}
              disabled={loadingMore}
              variant="outline"
              className="w-full text-tape-light-brown"
            >
              {loadingMore ? "読み込み中..." : "もっと見る"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
