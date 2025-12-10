"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Video, User } from "lucide-react";

type Booking = {
  id: string;
  status: string;
  payment_status: string;
  start_time: string;
  end_time: string;
  counselor: {
    display_name: string;
    avatar_url: string | null;
    slug: string;
  };
};

export function MyBookingsClient() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    try {
      const res = await fetch("/api/mypage/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings ?? []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancel = async (booking: Booking) => {
    if (!confirm("予約をキャンセルしますか？\n（規定のキャンセル料がかかる場合があります）")) return;
    
    try {
      const res = await fetch(`/api/counselors/${booking.counselor.slug}/bookings/${booking.id}/cancel`, {
        method: "POST"
      });
      
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "キャンセルに失敗しました");
      }
      
      alert("キャンセルしました");
      loadBookings();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "キャンセルに失敗しました");
    }
  };

  if (loading) return <p className="text-sm text-tape-light-brown text-center py-4">読み込み中...</p>;

  if (bookings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-tape-light-brown mb-4">予約履歴はありません。</p>
        <Link href="/counselor">
          <button className="rounded-full bg-tape-brown text-white px-6 py-2 text-sm hover:bg-tape-brown/90">
            カウンセラーを探す
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div key={booking.id} className="rounded-2xl border border-tape-beige bg-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className={`px-2 py-0.5 rounded-full ${
                booking.status === "confirmed" ? "bg-green-100 text-green-700" :
                booking.status === "cancelled" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>
                {booking.status === "confirmed" ? "予約確定" : booking.status === "cancelled" ? "キャンセル済" : "仮予約"}
              </span>
              <span className="text-tape-light-brown">
                {new Date(booking.start_time).toLocaleString("ja-JP", { month: "short", day: "numeric", weekday: "short" })}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <img 
                src={booking.counselor.avatar_url ?? "https://placehold.co/40x40/F5F2EA/5C554F?text=User"} 
                className="h-10 w-10 rounded-full object-cover border border-tape-beige"
                alt=""
              />
              <div>
                <p className="text-sm font-bold text-tape-brown">{booking.counselor.display_name}</p>
                <div className="flex items-center gap-3 text-xs text-tape-light-brown mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(booking.start_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} - 
                    {new Date(booking.end_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="h-3 w-3" /> オンライン
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <Link href={`/counselor/${booking.counselor.slug}`}>
              <button className="text-xs text-tape-brown border border-tape-beige rounded-full px-3 py-1.5 hover:bg-tape-cream">
                プロフィール
              </button>
            </Link>
            {booking.status !== "cancelled" && (
              <button 
                onClick={() => handleCancel(booking)}
                className="text-xs text-tape-pink border border-tape-pink/20 rounded-full px-3 py-1.5 hover:bg-tape-pink/10"
              >
                キャンセル
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
