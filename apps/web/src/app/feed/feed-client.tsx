"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Flag, MessageCircle, Sparkles } from "lucide-react";

import { FeedShareButton } from "./feed-share-button";

type FeedComment = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

type FeedEntry = {
  id: string;
  title: string | null;
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
  eventSummary: string | null;
  realization: string | null;
  feelings: { label: string; intensity: number }[];
  reactions: {
    counts: Record<string, number>;
    viewerReaction: string | null;
    total: number;
  };
  aiComment: { content: string; generatedAt: string | null } | null;
  counselorComment: { content: string; author: string } | null;
  isShareable: boolean;
  shareCount: number;
  comments?: FeedComment[];
  showComments?: boolean;
  commentInput?: string;
  submittingComment?: boolean;
  commentsError?: string;
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

const formatDateTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ja-JP", { hour12: false });
};

// かんじょうにっきエリアと同じ感情の色マッピング
const emotionToneMap: Record<string, string> = {
  恐怖: "bg-purple-100 text-purple-800 border-purple-200",
  悲しみ: "bg-blue-100 text-blue-800 border-blue-200",
  怒り: "bg-red-100 text-red-800 border-red-200",
  寂しさ: "bg-indigo-100 text-indigo-800 border-indigo-200",
  無価値感: "bg-gray-100 text-gray-800 border-gray-300",
  罪悪感: "bg-orange-100 text-orange-800 border-orange-200",
  悔しさ: "bg-green-100 text-green-800 border-green-200",
  恥ずかしさ: "bg-pink-100 text-pink-800 border-pink-200",
  嬉しい: "bg-yellow-100 text-yellow-800 border-yellow-200",
  感謝: "bg-teal-100 text-teal-800 border-teal-200",
  達成感: "bg-lime-100 text-lime-800 border-lime-200",
  幸せ: "bg-amber-100 text-amber-800 border-amber-200"
};

export function FeedPageClient() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const initialFetchedRef = useRef(false);

  const fetchFeed = useCallback(
    async (mode: "initial" | "append", cursorValue: string | null) => {
      if (mode === "append" && (!hasMore || loadingMore)) {
        return;
      }
      mode === "initial" ? setLoading(true) : setLoadingMore(true);
      try {
        const params = new URLSearchParams();
        if (mode === "append" && cursorValue) {
          params.set("cursor", cursorValue);
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
    [hasMore, loadingMore]
  );

  useEffect(() => {
    if (initialFetchedRef.current) return;
    initialFetchedRef.current = true;
    fetchFeed("initial", null);
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
      fetchFeed("initial", null);
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

  const handleToggleComments = async (entryId: string) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;
        const newShowComments = !entry.showComments;
        return { ...entry, showComments: newShowComments };
      })
    );

    const entry = entries.find((e) => e.id === entryId);
    if (entry && !entry.comments) {
      await loadComments(entryId);
    }
  };

  const loadComments = async (entryId: string) => {
    try {
      const res = await fetch(`/api/feed/${entryId}/comments`);
      if (!res.ok) throw new Error("Failed to load comments");
      const data = await res.json();
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, comments: data.comments, commentsError: undefined } : entry
        )
      );
    } catch (err) {
      console.error(err);
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, commentsError: "コメントの読み込みに失敗しました" } : entry
        )
      );
    }
  };

  const handleCommentSubmit = async (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    const commentInput = entry?.commentInput?.trim();
    if (!commentInput) return;

    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, submittingComment: true } : e
      )
    );

    try {
      const res = await fetch(`/api/feed/${entryId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentInput })
      });

      if (!res.ok) throw new Error("Failed to post comment");
      const data = await res.json();

      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== entryId) return e;
          return {
            ...e,
            comments: [...(e.comments || []), data.comment],
            commentInput: "",
            submittingComment: false
          };
        })
      );
    } catch (err) {
      console.error(err);
      alert("コメントの投稿に失敗しました");
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, submittingComment: false } : e
        )
      );
    }
  };

  const handleDeleteComment = async (entryId: string, commentId: string) => {
    if (!confirm("このコメントを削除しますか？")) return;

    try {
      const res = await fetch(`/api/feed/${entryId}/comments/${commentId}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Failed to delete comment");

      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== entryId) return e;
          return {
            ...e,
            comments: (e.comments || []).filter((c) => c.id !== commentId)
          };
        })
      );
    } catch (err) {
      console.error(err);
      alert("コメントの削除に失敗しました");
    }
  };

  const timeline = useMemo(() => entries, [entries]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-tape-beige bg-blue-50/50 shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm font-bold text-tape-brown mb-2">📖 みんなの日記について</p>
          <p className="text-xs text-tape-brown/80 leading-relaxed">
            ここでは、他のユーザーが「かんじょうにっき」で書いて公開した日記を閲覧できます。<br />
            新しい日記を書くには、<a href="/diary" className="text-tape-pink underline">かんじょうにっき</a>のページから投稿してください。
          </p>
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
                  <div className="flex-1">
                    <p className="text-sm font-bold text-tape-brown">{entry.author.displayName ?? "匿名ユーザー"}</p>
                    <p className="text-xs text-tape-light-brown">{new Date(entry.publishedAt ?? entry.journalDate).toLocaleString("ja-JP")}</p>
                  </div>
                  {entry.moodLabel && (
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        emotionToneMap[entry.moodLabel] ?? "bg-gray-100 text-gray-800 border-gray-200"
                      )}
                    >
                      {entry.moodLabel}
                    </span>
                  )}
                </div>
                {entry.title && <h3 className="mt-4 text-lg font-semibold text-tape-brown">{entry.title}</h3>}
                {entry.eventSummary && (
                  <div className="mt-3 rounded-2xl border border-tape-beige bg-white/60 p-3 text-sm text-tape-brown">
                    <p className="text-xs font-semibold text-tape-light-brown">出来事のメモ</p>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{entry.eventSummary}</p>
                  </div>
                )}
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-tape-brown/90">{entry.content}</p>
                {entry.realization && (
                  <div className="mt-3 rounded-2xl border border-dashed border-tape-beige p-3 text-sm text-tape-brown">
                    <p className="text-xs font-semibold text-tape-light-brown">気づき・意味づけ</p>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{entry.realization}</p>
                  </div>
                )}
                {entry.feelings.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {entry.feelings.map((feeling) => (
                      <span key={`${entry.id}-${feeling.label}`} className="rounded-full bg-tape-pink/10 px-3 py-1 text-tape-brown">
                        {feeling.label}
                      </span>
                    ))}
                  </div>
                )}
                {entry.aiComment && (
                  <div className="mt-4 rounded-2xl border border-tape-pink/30 bg-[#fff6f8] p-4 text-sm text-tape-brown">
                    <p className="text-xs font-bold text-tape-pink flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> ミシェルAIからのコメント
                    </p>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed">{entry.aiComment.content}</p>
                    {entry.aiComment.generatedAt && (
                      <p className="mt-2 text-[11px] text-tape-pink">生成日時: {formatDateTime(entry.aiComment.generatedAt)}</p>
                    )}
                  </div>
                )}
                {entry.counselorComment && (
                  <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                    <p className="text-xs font-bold flex items-center gap-2">
                      <span role="img" aria-label="counselor">💬</span> カウンセラーからのコメント
                    </p>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed text-yellow-900">
                      {entry.counselorComment.content}
                    </p>
                    <p className="mt-2 text-[11px] text-yellow-800">— {entry.counselorComment.author}</p>
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
                    onClick={() => handleToggleComments(entry.id)}
                    className="flex items-center gap-1 rounded-full border border-tape-beige px-3 py-1 text-xs text-tape-light-brown hover:bg-tape-cream"
                  >
                    <MessageCircle className="h-3 w-3" />
                    コメント {entry.comments && entry.comments.length > 0 ? `(${entry.comments.length})` : ""}
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    {entry.isShareable && (
                      <FeedShareButton
                        entryId={entry.id}
                        contentPreview={entry.content}
                        shareCount={entry.shareCount}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleReport(entry.id)}
                      className="text-tape-light-brown hover:text-tape-pink"
                      title="通報"
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-tape-light-brown">
                  <p>公開日: {new Date(entry.publishedAt ?? entry.journalDate).toLocaleDateString("ja-JP")}</p>
                  <Link
                    href={`/feed/${entry.id}`}
                    className="text-tape-pink underline decoration-dotted underline-offset-4"
                  >
                    詳しく読む →
                  </Link>
                </div>

                {entry.showComments && (
                  <div className="mt-4 space-y-3 border-t border-tape-beige pt-4">
                    <p className="text-sm font-bold text-tape-brown">コメント</p>
                    <p className="text-[11px] text-tape-light-brown">※ コメント投稿で +2pt が付与されます。</p>
                    
                    {entry.commentsError ? (
                      <div className="rounded-lg bg-red-50 p-3 text-center">
                        <p className="text-xs text-red-600 mb-2">{entry.commentsError}</p>
                        <button
                          onClick={() => loadComments(entry.id)}
                          className="text-xs text-red-700 underline hover:text-red-800"
                        >
                          再試行
                        </button>
                      </div>
                    ) : entry.comments && entry.comments.length > 0 ? (
                      <div className="space-y-3">
                        {entry.comments.map((comment) => (
                          <div key={comment.id} className="rounded-lg bg-tape-cream/50 p-3">
                            <div className="flex items-start gap-2">
                              <img
                                src={comment.author.avatarUrl ?? "https://placehold.co/32x32/F5F2EA/5C554F?text=User"}
                                alt={comment.author.displayName}
                                className="h-8 w-8 rounded-full object-cover border border-tape-beige"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold text-tape-brown">{comment.author.displayName}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-tape-light-brown">{new Date(comment.createdAt).toLocaleString("ja-JP")}</p>
                                    <button
                                      onClick={() => handleDeleteComment(entry.id, comment.id)}
                                      className="text-xs text-tape-pink hover:underline"
                                    >
                                      削除
                                    </button>
                                  </div>
                                </div>
                                <p className="mt-1 text-sm text-tape-brown whitespace-pre-wrap">{comment.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-tape-light-brown">まだコメントがありません</p>
                    )}

                    <div className="flex gap-2">
                      <textarea
                        value={entry.commentInput || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEntries((prev) =>
                            prev.map((item) =>
                              item.id === entry.id ? { ...item, commentInput: value } : item
                            )
                          );
                        }}
                        placeholder="コメントを入力..."
                        className="flex-1 rounded-lg border border-tape-beige bg-white px-3 py-2 text-base md:text-sm text-tape-brown focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink resize-none"
                        rows={2}
                      />
                      <Button
                        onClick={() => handleCommentSubmit(entry.id)}
                        disabled={!entry.commentInput?.trim() || entry.submittingComment}
                        size="sm"
                        className="bg-tape-pink text-tape-brown hover:bg-tape-pink/90"
                      >
                        {entry.submittingComment ? "送信中..." : "送信"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {hasMore && (
            <Button
              onClick={() => fetchFeed("append", cursor)}
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
