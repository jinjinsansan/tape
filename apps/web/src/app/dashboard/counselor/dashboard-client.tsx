"use client";

import { useCallback, useEffect, useState } from "react";

type DashboardBooking = {
  id: string;
  status: string;
  payment_status: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  intro_chat_id: string | null;
  client: {
    id: string;
    display_name: string | null;
  } | null;
};

type IntroMessage = {
  id: string;
  body: string;
  created_at: string;
  role: string;
  sender_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export function CounselorDashboardClient() {
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IntroMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/counselors/dashboard/bookings");
      if (!res.ok) throw new Error("予約の取得に失敗しました");
      const data = await res.json();
      setBookings(data.bookings ?? []);
      if (!selectedBookingId && data.bookings?.length) {
        setSelectedBookingId(data.bookings[0].id);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "予約の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [selectedBookingId]);

  const loadMessages = useCallback(async (chatId: string | null) => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    try {
      const res = await fetch(`/api/counselors/dashboard/intro-chats/${chatId}`);
      if (!res.ok) throw new Error("メッセージの取得に失敗しました");
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "メッセージの取得に失敗しました");
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    const booking = bookings.find((item) => item.id === selectedBookingId);
    loadMessages(booking?.intro_chat_id ?? null);
  }, [bookings, selectedBookingId, loadMessages]);

  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId) ?? null;

  const handleSendMessage = async () => {
    if (!selectedBooking?.intro_chat_id || !messageInput.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/counselors/dashboard/intro-chats/${selectedBooking.intro_chat_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageInput.trim() })
      });
      if (!res.ok) throw new Error("送信に失敗しました");
      setMessageInput("");
      loadMessages(selectedBooking.intro_chat_id);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-slate-500">
        予約を読み込んでいます...
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.3em] text-rose-500">COUNSELOR DASHBOARD</p>
        <h1 className="text-3xl font-black text-slate-900">予約・チャット管理</h1>
        <p className="text-sm text-slate-500">最新の予約と初回チャットをここから管理できます。</p>
      </header>

      {error && <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-600">{error}</p>}

      <section className="grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500">予約一覧</h2>
          <div className="space-y-2">
            {bookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => setSelectedBookingId(booking.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-xs ${
                  booking.id === selectedBookingId ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-sm font-semibold text-slate-800">{booking.client?.display_name ?? "非公開"}</p>
                <p className="text-slate-500">{new Date(booking.start_time).toLocaleString("ja-JP")}</p>
                <p className="text-[11px] text-slate-400">{booking.status} · {booking.payment_status}</p>
              </button>
            ))}
            {bookings.length === 0 && <p className="text-xs text-slate-400">現在表示する予約はありません。</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-xl shadow-slate-200/70">
          {selectedBooking ? (
            <div className="flex h-full flex-col gap-4">
              <div>
                <p className="text-xs font-semibold text-rose-500">選択中の予約</p>
                <h2 className="text-xl font-black text-slate-900">
                  {selectedBooking.client?.display_name ?? "非公開"}
                </h2>
                <p className="text-sm text-slate-500">{new Date(selectedBooking.start_time).toLocaleString("ja-JP")}</p>
                <p className="text-xs text-slate-400">
                  {selectedBooking.status} · {selectedBooking.payment_status}
                </p>
                {selectedBooking.notes && <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">メモ: {selectedBooking.notes}</p>}
              </div>

              <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                {selectedBooking.intro_chat_id ? (
                  <div className="flex h-full flex-col">
                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 text-sm text-slate-700">
                      {messages.map((message) => (
                        <article key={message.id} className={`rounded-2xl px-3 py-2 ${message.role === "counselor" ? "bg-white" : "bg-slate-200/60"}`}>
                          <div className="text-[11px] text-slate-400">
                            {message.sender_profile?.display_name ?? (message.role === "counselor" ? "あなた" : "クライアント")} · {new Date(message.created_at).toLocaleString("ja-JP")}
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
                        </article>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <textarea
                        value={messageInput}
                        onChange={(event) => setMessageInput(event.target.value)}
                        placeholder="クライアントへのメッセージ"
                        className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-200 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={sending || !messageInput.trim()}
                        className="w-28 rounded-2xl bg-rose-500 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-rose-300"
                      >
                        {sending ? "送信中" : "送信"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-sm text-slate-500">チャットはまだ開始されていません。</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">予約を選択すると詳細が表示されます。</p>
          )}
        </div>
      </section>
    </main>
  );
}
