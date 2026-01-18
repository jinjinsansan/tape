"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, Trash2 } from "lucide-react";

type NotificationCategoryKey = "all" | "announcement" | "booking" | "wallet" | "other";

type NotificationRow = {
  id: string;
  title: string | null;
  body: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
  category: "announcement" | "booking" | "wallet" | "other";
};

const CATEGORY_TABS: { key: NotificationCategoryKey; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "announcement", label: "運営" },
  { key: "booking", label: "予約" },
  { key: "wallet", label: "ポイント" },
  { key: "other", label: "その他" }
];

const CATEGORY_LABEL: Record<Exclude<NotificationCategoryKey, "all">, string> = {
  announcement: "運営からのお知らせ",
  booking: "カウンセリング予約",
  wallet: "ポイント・決済",
  other: "その他"
};

const formatDate = (value: string) => {
  return new Date(value).toLocaleString("ja-JP", { hour12: false });
};

export function NotificationsClient() {
  const [category, setCategory] = useState<NotificationCategoryKey>("all");
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const search = new URLSearchParams();
      if (category !== "all") {
        search.set("category", category);
      }
      const query = search.toString();
      const endpoint = query ? `/api/mypage/notifications?${query}` : "/api/mypage/notifications";
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("お知らせの取得に失敗しました");
      }
      const payload = await res.json();
      setNotifications(payload.notifications ?? []);
      setExpandedIds([]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "お知らせの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );

  const markAsRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      try {
        const res = await fetch("/api/mypage/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids })
        });
        if (!res.ok) {
          throw new Error("既読処理に失敗しました");
        }
        setNotifications((prev) =>
          prev.map((item) => (ids.includes(item.id) ? { ...item, read_at: new Date().toISOString() } : item))
        );
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "既読処理に失敗しました");
      }
    },
    []
  );

  const handleMarkAll = () => {
    const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id);
    if (unreadIds.length === 0) return;
    markAsRead(unreadIds);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setError(null);
      try {
        const res = await fetch("/api/mypage/notifications", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id] })
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.error ?? "お知らせの削除に失敗しました");
        }
        setNotifications((prev) => prev.filter((item) => item.id !== id));
        setExpandedIds((prev) => prev.filter((itemId) => itemId !== id));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "お知らせの削除に失敗しました");
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategory(tab.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                category === tab.key
                  ? "border-tape-orange bg-tape-orange/10 text-tape-brown"
                  : "border-tape-beige bg-white text-tape-light-brown hover:bg-tape-cream"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={handleMarkAll} disabled={unreadCount === 0}>
          すべて既読にする
        </Button>
      </div>

      {error && <p className="rounded-2xl bg-rose-50 px-4 py-2 text-xs text-rose-600">{error}</p>}

      {loading ? (
        <div className="rounded-2xl border border-tape-beige bg-white/80 px-4 py-6 text-center text-sm text-tape-light-brown">
          読み込み中...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tape-beige bg-tape-cream/40 px-4 py-8 text-center text-sm text-tape-light-brown">
          お知らせはまだありません。
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((item) => {
            const isExpanded = expandedIds.includes(item.id);
            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-2xl border px-4 py-3 transition",
                  item.read_at ? "border-tape-beige bg-white" : "border-tape-orange/40 bg-tape-orange/5"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(item.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-tape-beige bg-white">
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-tape-brown transition-transform",
                          isExpanded ? "rotate-180" : ""
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-tape-light-brown">
                        <span className="rounded-full bg-tape-beige px-2 py-0.5 text-[10px] text-tape-brown">
                          {CATEGORY_LABEL[item.category]}
                        </span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-tape-brown line-clamp-1">{item.title ?? "お知らせ"}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {!item.read_at && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-tape-orange"
                        onClick={() => markAsRead([item.id])}
                      >
                        既読
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="rounded-full border border-tape-beige p-2 text-tape-light-brown transition hover:bg-tape-cream disabled:opacity-50"
                      aria-label="通知を削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 space-y-2 rounded-2xl border border-dashed border-tape-beige bg-white/80 p-3 text-xs text-tape-brown">
                    <p className="whitespace-pre-wrap leading-relaxed">{item.body ?? "本文はありません。"}</p>
                    {item.data && Object.keys(item.data).length > 0 && (
                      <pre className="rounded-xl bg-tape-cream/60 p-2 text-[10px] text-tape-light-brown overflow-x-auto">
                        {JSON.stringify(item.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
