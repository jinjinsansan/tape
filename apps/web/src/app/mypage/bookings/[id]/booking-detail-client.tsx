"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowLeft, Clock, Video, MessageSquare } from "lucide-react";

type BookingDetail = {
  id: string;
  status: string;
  payment_status: string;
  price_cents: number;
  notes: string | null;
  created_at: string;
  intro_chat_id: string | null;
  start_time: string;
  end_time: string;
  counselor: {
    display_name: string;
    avatar_url: string | null;
    slug: string;
  };
};

type ChatMessage = {
  id: string;
  body: string;
  role: string;
  created_at: string;
  sender: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
};

export function BookingDetailClient({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/mypage/bookings/${bookingId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("予約が見つかりませんでした");
        }
        throw new Error("予約情報の取得に失敗しました");
      }
      const data = await res.json();
      setBooking(data.booking);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "予約情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/mypage/bookings/${bookingId}/chat`);
      if (!res.ok) {
        if (res.status === 404) {
          return; // No chat yet
        }
        throw new Error("メッセージの取得に失敗しました");
      }
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch (err) {
      console.error(err);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
    loadMessages();
  }, [loadBooking, loadMessages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!booking?.intro_chat_id) {
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const chatId = booking.intro_chat_id;

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "counselor_intro_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log("New message received:", payload);
          const newMessage = payload.new as any;
          
          setMessages((prev) => [
            ...prev,
            {
              id: newMessage.id,
              body: newMessage.body,
              role: newMessage.role,
              created_at: newMessage.created_at,
              sender: {
                id: newMessage.sender_user_id,
                display_name: newMessage.role === "counselor" ? booking.counselor.display_name : "あなた",
                avatar_url: newMessage.role === "counselor" ? booking.counselor.avatar_url : null,
              },
            },
          ]);
        }
      )
      .subscribe();

    console.log(`Subscribed to realtime messages for chat: ${chatId}`);

    return () => {
      console.log(`Unsubscribing from chat: ${chatId}`);
      supabase.removeChannel(channel);
    };
  }, [booking]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/mypage/bookings/${bookingId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageInput.trim() }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "メッセージの送信に失敗しました");
      }

      setMessageInput("");
      // Message will be added via Realtime
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "メッセージの送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async () => {
    if (!booking) return;

    if (!confirm("ウォレットから支払いますか？\n予約が確定されます。")) return;

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/counselors/${booking.counselor.slug}/bookings/${booking.id}/confirm`, {
        method: "POST",
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "決済に失敗しました");
      }

      setSuccess("決済が完了し、予約が確定しました！");
      // Reload booking to update status
      await loadBooking();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "決済に失敗しました");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;

    if (!confirm("予約をキャンセルしますか？\n（規定のキャンセル料がかかる場合があります）")) return;

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/counselors/${booking.counselor.slug}/bookings/${booking.id}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "キャンセルに失敗しました");
      }

      setSuccess("予約をキャンセルしました。");
      // Reload booking to update status
      await loadBooking();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "キャンセルに失敗しました");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 text-center text-sm text-tape-light-brown">
        読み込み中...
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 text-center">
        <p className="text-sm text-tape-pink mb-4">{error ?? "予約が見つかりませんでした"}</p>
        <button
          onClick={() => router.push("/mypage")}
          className="text-sm text-tape-brown hover:underline"
        >
          マイページに戻る
        </button>
      </div>
    );
  }

  const statusText = booking.status === "confirmed" ? "予約確定" : booking.status === "cancelled" ? "キャンセル済" : "仮予約";
  const statusColor = booking.status === "confirmed" ? "bg-green-100 text-green-700" : booking.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-4 sm:space-y-6">
      <button
        onClick={() => router.push("/mypage")}
        className="flex items-center gap-2 text-sm text-tape-light-brown hover:text-tape-brown"
      >
        <ArrowLeft className="h-4 w-4" />
        マイページに戻る
      </button>

      <div className="rounded-2xl sm:rounded-3xl border border-tape-beige bg-white p-4 sm:p-6 shadow-sm">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={booking.counselor.avatar_url ?? "https://placehold.co/60x60/F5F2EA/5C554F?text=User"}
              alt={booking.counselor.display_name}
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover border border-tape-beige flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-tape-orange mb-1">COUNSELOR</p>
              <h1 className="text-xl sm:text-2xl font-bold text-tape-brown truncate">{booking.counselor.display_name}</h1>
              <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                {statusText}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 text-sm text-tape-brown">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-tape-orange" />
            <span className="font-medium">
              {new Date(booking.start_time).toLocaleString("ja-JP", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" })}
              {" - "}
              {new Date(booking.end_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-tape-orange" />
            <span>オンラインセッション</span>
          </div>
          <div className="rounded-2xl border border-tape-beige bg-tape-cream/30 p-4">
            <p className="text-xs font-semibold text-tape-light-brown mb-2">ご相談内容</p>
            <p className="text-sm text-tape-brown whitespace-pre-wrap">{booking.notes ?? "（記載なし）"}</p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-tape-brown">
              ¥{(booking.price_cents / 100).toLocaleString()}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-tape-pink/20 bg-tape-pink/10 p-3 text-sm text-tape-pink">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {booking.status === "pending" && booking.payment_status === "unpaid" && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleConfirm}
              disabled={processing}
              className="flex-1 rounded-full bg-tape-orange text-white px-6 py-3 font-bold hover:bg-tape-orange/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "処理中..." : "ウォレットで支払う"}
            </button>
            <button
              onClick={handleCancel}
              disabled={processing}
              className="rounded-full border border-tape-pink text-tape-pink px-6 py-3 font-medium hover:bg-tape-pink/10 disabled:opacity-50 disabled:cursor-not-allowed sm:flex-shrink-0"
            >
              キャンセル
            </button>
          </div>
        )}

        {booking.status === "confirmed" && (
          <div className="mt-6 text-center">
            <p className="text-sm text-green-600 font-medium mb-3">✅ 予約確定済み</p>
            {booking.status !== "cancelled" && (
              <button
                onClick={handleCancel}
                disabled={processing}
                className="rounded-full border border-tape-pink text-tape-pink px-6 py-2 text-sm font-medium hover:bg-tape-pink/10 disabled:opacity-50"
              >
                キャンセル
              </button>
            )}
          </div>
        )}

        {booking.status === "cancelled" && (
          <div className="mt-6 text-center">
            <p className="text-sm text-tape-light-brown">この予約はキャンセル済みです。</p>
          </div>
        )}
      </div>

      {booking.intro_chat_id && (
        <div className="rounded-2xl sm:rounded-3xl border border-tape-beige bg-white p-4 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-tape-beige pb-3 sm:pb-4">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-tape-orange" />
            <h2 className="text-lg sm:text-xl font-bold text-tape-brown">チャット</h2>
          </div>

          <div className="mb-4 space-y-3 max-h-[500px] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${msg.role === "counselor" ? "items-start" : "items-end"}`}
              >
                <div className="flex items-center gap-2 text-[10px] text-tape-light-brown px-1">
                  <span>{msg.sender.display_name}</span>
                  <span>{new Date(msg.created_at).toLocaleString("ja-JP")}</span>
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === "counselor"
                      ? "bg-white border border-tape-beige text-tape-brown"
                      : "bg-tape-orange/10 text-tape-brown border border-tape-orange/20"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.body}</p>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-center text-sm text-tape-light-brown py-8">
                まだメッセージはありません。最初のメッセージを送ってみましょう。
              </p>
            )}
          </div>

          <div className="flex gap-2 sm:gap-3">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="メッセージを入力..."
              className="flex-1 rounded-xl sm:rounded-2xl border border-tape-beige bg-tape-cream/50 px-3 sm:px-4 py-2 sm:py-3 text-base md:text-sm focus:border-tape-orange focus:outline-none focus:ring-1 focus:ring-tape-orange resize-none h-16 sm:h-20"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={sending || !messageInput.trim()}
              className="h-16 sm:h-20 px-4 sm:px-6 bg-tape-orange text-white hover:bg-tape-orange/90 rounded-xl sm:rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium"
            >
              送信
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
