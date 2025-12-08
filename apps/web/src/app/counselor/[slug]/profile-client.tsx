"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Counselor = {
  id: string;
  slug: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  specialties: string[] | null;
  hourly_rate_cents: number;
  intro_video_url: string | null;
  profile_metadata: Record<string, unknown> | null;
};

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
};

type Booking = {
  id: string;
  status: string;
  price_cents: number;
};

type ChatMessage = {
  id: string;
  body: string;
  role: string;
  created_at: string;
  sender_profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

const formatDateTime = (value: string) => new Date(value).toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });

const yen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;

export function CounselorPage({ slug }: { slug: string }) {
  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [notes, setNotes] = useState("初回の目的や課題をご記入ください。");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingAction, setPendingAction] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/counselors/${slug}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("カウンセラーが見つかりませんでした。");
        }
        throw new Error("プロフィールの読み込みに失敗しました");
      }
      const data = await res.json();
      setCounselor(data.counselor);
      setSlots(data.slots ?? []);
      setIsAuthenticated(Boolean(data.viewerId));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "不明なエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const selectedSlot = useMemo(() => slots.find((slot) => slot.id === selectedSlotId) ?? null, [slots, selectedSlotId]);

  const handleBook = async () => {
    if (!selectedSlotId) {
      setError("予約枠を選択してください");
      return;
    }
    setPendingAction(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/counselors/${slug}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ slotId: selectedSlotId, notes })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "予約に失敗しました");
      }
      const data = await res.json();
      setBooking(data.booking);
      setChatId(data.chatId);
      setSuccess("仮予約を受け付けました。ウォレット決済で確定してください。");
      loadProfile();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "予約に失敗しました");
    } finally {
      setPendingAction(false);
    }
  };

  const handleConfirm = async () => {
    if (!booking) return;
    setPendingAction(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/counselors/${slug}/bookings/${booking.id}/confirm`, { method: "POST" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "決済に失敗しました");
      }
      setSuccess("決済が完了し、予約が確定しました。");
      loadProfile();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "決済に失敗しました");
    } finally {
      setPendingAction(false);
    }
  };

  const loadChatMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      const res = await fetch(`/api/counselors/${slug}/intro-chats/${chatId}`);
      if (!res.ok) {
        throw new Error("メッセージ取得に失敗しました");
      }
      const data = await res.json();
      setChatMessages(data.messages ?? []);
    } catch (err) {
      console.error(err);
    }
  }, [chatId, slug]);

  useEffect(() => {
    loadChatMessages();
  }, [loadChatMessages]);

  const handleSendMessage = async () => {
    if (!chatId || !chatInput.trim()) return;
    setPendingAction(true);
    try {
      const res = await fetch(`/api/counselors/${slug}/intro-chats/${chatId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ body: chatInput.trim() })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "メッセージ送信に失敗しました");
      }
      setChatInput("");
      loadChatMessages();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "メッセージ送信に失敗しました");
    } finally {
      setPendingAction(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-slate-500">
        プロフィールを読み込んでいます...
      </main>
    );
  }

  if (!counselor || error && !booking) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-rose-500">
        {error ?? "カウンセラー情報が見つかりませんでした。"}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <section className="rounded-3xl border border-slate-100 bg-white/90 p-8 shadow-xl shadow-slate-200/70">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              <img src={counselor.avatar_url ?? "https://placehold.co/100x100"} alt={counselor.display_name} className="h-20 w-20 rounded-2xl object-cover" />
              <div>
                <p className="text-xs font-semibold text-rose-500">Tape認定カウンセラー</p>
                <h1 className="text-3xl font-black text-slate-900">{counselor.display_name}</h1>
                <p className="text-sm text-slate-500">{counselor.specialties?.join(" / ")}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">{counselor.bio}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1">初回セッション {yen(counselor.hourly_rate_cents)} / 60分</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">オンライン / Tapeチャット</span>
            </div>
            {counselor.intro_video_url && (
              <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-100 shadow-inner">
                <iframe
                  src={counselor.intro_video_url}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="紹介動画"
                />
              </div>
            )}
          </div>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <h2 className="text-sm font-semibold text-slate-600">空き枠</h2>
            <div className="mt-3 space-y-2 text-sm">
              {slots.slice(0, 6).map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`w-full rounded-2xl border px-3 py-2 text-left ${selectedSlotId === slot.id ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}
                >
                  <p className="font-semibold text-slate-700">{formatDateTime(slot.start_time)}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(slot.end_time)} まで</p>
                </button>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-3 h-24 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-200 focus:outline-none"
              placeholder="ご相談内容や目的を入力"
              disabled={!isAuthenticated}
            />
            {!isAuthenticated && (
              <p className="mt-2 text-xs text-rose-500">ログインすると予約できます。</p>
            )}
            <button
              type="button"
              onClick={handleBook}
              disabled={!selectedSlot || !isAuthenticated || pendingAction}
              className="mt-4 w-full rounded-full bg-slate-900 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              予約リクエスト
            </button>
            {booking && booking.status === "pending" && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pendingAction}
                className="mt-2 w-full rounded-full border border-slate-300 py-2 text-sm font-semibold text-slate-600"
              >
                ウォレットで支払う
              </button>
            )}
          </div>
        </div>
        {error && <p className="mt-4 text-xs text-rose-500">{error}</p>}
        {success && <p className="mt-4 text-xs text-emerald-600">{success}</p>}
      </section>

      {chatId && (
        <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-500">INTRO CHAT</p>
              <h2 className="text-xl font-black text-slate-900">初回チャット</h2>
            </div>
            <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-500" onClick={loadChatMessages}>
              更新
            </button>
          </header>
          <div className="mt-4 space-y-3">
            {chatMessages.map((message) => (
              <article key={message.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{message.sender_profile?.display_name ?? (message.role === "counselor" ? counselor.display_name : "あなた")}</span>
                  <span>{new Date(message.created_at).toLocaleString("ja-JP")}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <textarea
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="挨拶や相談内容を送ってください"
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-200 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={pendingAction || !chatInput.trim()}
              className="w-32 rounded-2xl bg-rose-500 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              送信
            </button>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-100 bg-gradient-to-br from-rose-50 to-white p-6 text-xs text-slate-500">
        <p>※ 予約確定後の24時間以内キャンセルは50%のキャンセル料が発生します。ウォレット残高が不足している場合は事前にチャージしてください。</p>
        <p className="mt-2">※ カウンセラー都合でキャンセルになった場合は自動的に全額返金されます。</p>
      </section>
    </main>
  );
}
