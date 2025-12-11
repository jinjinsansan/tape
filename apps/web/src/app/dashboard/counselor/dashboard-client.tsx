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

type CounselorProfile = {
  id: string;
  display_name: string;
  slug: string;
  avatar_url: string | null;
  bio: string | null;
  specialties: string[] | null;
  hourly_rate_cents: number;
  intro_video_url: string | null;
};

export function CounselorDashboardClient() {
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IntroMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState<CounselorProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    display_name: "",
    avatar_url: "",
    bio: "",
    specialties: "",
    hourly_rate_cents: 12000,
    intro_video_url: "",
  });

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

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/counselors/me/profile");
      if (!res.ok) throw new Error("プロフィールの取得に失敗しました");
      const data = await res.json();
      setProfile(data.counselor);
      setProfileForm({
        display_name: data.counselor.display_name || "",
        avatar_url: data.counselor.avatar_url || "",
        bio: data.counselor.bio || "",
        specialties: data.counselor.specialties?.join(", ") || "",
        hourly_rate_cents: data.counselor.hourly_rate_cents || 12000,
        intro_video_url: data.counselor.intro_video_url || "",
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleSaveProfile = async () => {
    try {
      const res = await fetch("/api/counselors/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: profileForm.display_name,
          avatar_url: profileForm.avatar_url || null,
          bio: profileForm.bio || null,
          specialties: profileForm.specialties ? profileForm.specialties.split(",").map(s => s.trim()).filter(Boolean) : null,
          hourly_rate_cents: profileForm.hourly_rate_cents,
          intro_video_url: profileForm.intro_video_url || null,
        })
      });
      if (!res.ok) throw new Error("プロフィールの更新に失敗しました");
      alert("プロフィールを更新しました");
      setEditingProfile(false);
      fetchProfile();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "プロフィールの更新に失敗しました");
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchProfile();
  }, [fetchBookings, fetchProfile]);

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
        <h1 className="text-3xl font-black text-slate-900">カウンセラーダッシュボード</h1>
        <p className="text-sm text-slate-500">予約、チャット、プロフィールをここから管理できます。</p>
      </header>

      {error && <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-600">{error}</p>}

      {profile && (
        <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-purple-500">プロフィール管理</p>
              <h2 className="text-xl font-black text-slate-900">カウンセラー情報</h2>
            </div>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="rounded-full bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600"
              >
                編集
              </button>
            )}
          </div>

          {editingProfile ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">表示名</label>
                <input
                  type="text"
                  value={profileForm.display_name}
                  onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">アバター画像URL</label>
                <input
                  type="url"
                  value={profileForm.avatar_url}
                  onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">自己紹介</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="カウンセラーとしての経歴や得意分野を記入してください"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">専門分野（カンマ区切り）</label>
                <input
                  type="text"
                  value={profileForm.specialties}
                  onChange={(e) => setProfileForm({ ...profileForm, specialties: e.target.value })}
                  placeholder="恋愛, 職場, HSP"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">時給（円）</label>
                <input
                  type="number"
                  value={profileForm.hourly_rate_cents / 100}
                  onChange={(e) => setProfileForm({ ...profileForm, hourly_rate_cents: Math.round(Number(e.target.value) * 100) })}
                  min="0"
                  step="100"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">紹介動画URL（YouTube埋め込み用）</label>
                <input
                  type="url"
                  value={profileForm.intro_video_url}
                  onChange={(e) => setProfileForm({ ...profileForm, intro_video_url: e.target.value })}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setEditingProfile(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="rounded-full bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <img
                  src={profile.avatar_url || "https://placehold.co/80x80/F5F2EA/5C554F?text=User"}
                  alt={profile.display_name}
                  className="h-20 w-20 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <p className="text-lg font-bold text-slate-900">{profile.display_name}</p>
                  <p className="text-xs text-slate-500">slug: {profile.slug}</p>
                  <a
                    href={`/counselor/${profile.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-500 hover:underline"
                  >
                    公開プロフィールを見る →
                  </a>
                </div>
              </div>
              {profile.bio && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">自己紹介</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}
              {profile.specialties && profile.specialties.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">専門分野</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.specialties.map((spec) => (
                      <span key={spec} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">時給</p>
                <p className="text-sm text-slate-700">¥{(profile.hourly_rate_cents / 100).toLocaleString()} / 60分</p>
              </div>
            </div>
          )}
        </section>
      )}

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
