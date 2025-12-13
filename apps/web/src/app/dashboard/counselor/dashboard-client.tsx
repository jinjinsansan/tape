"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  COUNSELOR_PLAN_CONFIGS,
  CounselorPlanType,
  CounselorPlanSelection,
  normalizePlanSelection,
  DEFAULT_COUNSELOR_PLAN_SELECTION
} from "@/constants/counselor-plans";

type DashboardBooking = {
  id: string;
  status: string;
  payment_status: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  intro_chat_id: string | null;
  plan_type: CounselorPlanType;
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
  profile_metadata: Record<string, unknown> | null;
};

type CounselorSlot = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
};

type EarningsData = {
  total: number;
  pending: number;
  thisMonth: number;
  monthly: Array<{ month: string; earnings: number }>;
};

type EarningsStats = {
  totalBookings: number;
  paidBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  pendingBookings: number;
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
    intro_video_url: "",
  });
  const [planSettings, setPlanSettings] = useState<CounselorPlanSelection>(DEFAULT_COUNSELOR_PLAN_SELECTION);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [mySlots, setMySlots] = useState<CounselorSlot[]>([]);
  const [slotForm, setSlotForm] = useState({ date: "", startTime: "10:00", endTime: "11:00" });
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [earningsStats, setEarningsStats] = useState<EarningsStats | null>(null);

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
        intro_video_url: data.counselor.intro_video_url || "",
      });
      setPlanSettings(normalizePlanSelection(data.counselor.profile_metadata));
      // Load slots after getting profile
      if (data.counselor?.slug) {
        loadSlots(data.counselor.slug);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadSlots = async (slug: string) => {
    try {
      const res = await fetch(`/api/counselors/${slug}`);
      if (!res.ok) throw new Error("予約枠の取得に失敗しました");
      const data = await res.json();
      setMySlots(data.slots ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSlot = async () => {
    if (!profile) return;
    try {
      const start = new Date(`${slotForm.date}T${slotForm.startTime}:00`);
      const end = new Date(`${slotForm.date}T${slotForm.endTime}:00`);
      
      const res = await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counselorId: profile.id,
          startTime: start.toISOString(),
          endTime: end.toISOString()
        })
      });
      
      if (!res.ok) throw new Error("予約枠の追加に失敗しました");
      
      alert("予約枠を追加しました");
      loadSlots(profile.slug);
      setSlotForm({ date: "", startTime: "10:00", endTime: "11:00" });
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "予約枠の追加に失敗しました");
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("この予約枠を削除しますか？")) return;
    try {
      const res = await fetch(`/api/admin/slots/${slotId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      if (profile) loadSlots(profile.slug);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      alert("画像サイズは5MB以下にしてください");
      return;
    }

    // Validate file type
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      alert("JPEG、PNG、WebP形式の画像のみアップロードできます");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/counselors/me/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "画像のアップロードに失敗しました");
      }

      const data = await res.json();
      setProfileForm({ ...profileForm, avatar_url: data.url });
      alert("画像をアップロードしました");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "画像のアップロードに失敗しました");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const togglePlanSetting = (planId: CounselorPlanType) => {
    setPlanSettings((prev) => {
      const next = { ...prev, [planId]: !prev[planId] } as CounselorPlanSelection;
      if (!next.single_session && !next.monthly_course) {
        return prev;
      }
      return next;
    });
  };

  const handleSaveProfile = async () => {
    try {
      const sanitizedPlans = {
        ...planSettings,
        single_session: Boolean(planSettings.single_session),
        monthly_course: Boolean(planSettings.monthly_course)
      };
      const res = await fetch("/api/counselors/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: profileForm.display_name,
          avatar_url: profileForm.avatar_url || null,
          bio: profileForm.bio || null,
          specialties: profileForm.specialties ? profileForm.specialties.split(",").map(s => s.trim()).filter(Boolean) : null,
          intro_video_url: profileForm.intro_video_url || null,
          plan_settings: sanitizedPlans
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

  const fetchEarnings = useCallback(async () => {
    try {
      const res = await fetch("/api/counselors/me/earnings");
      if (!res.ok) throw new Error("売り上げの取得に失敗しました");
      const data = await res.json();
      setEarnings(data.earnings);
      setEarningsStats(data.stats);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchProfile();
    fetchEarnings();
  }, [fetchBookings, fetchProfile, fetchEarnings]);

  useEffect(() => {
    const booking = bookings.find((item) => item.id === selectedBookingId);
    loadMessages(booking?.intro_chat_id ?? null);
  }, [bookings, selectedBookingId, loadMessages]);

  // Realtime subscription for new messages
  useEffect(() => {
    const booking = bookings.find((item) => item.id === selectedBookingId);
    if (!booking || !booking.intro_chat_id) {
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const chatId = booking.intro_chat_id;

    // Subscribe to new messages in this chat
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
          
          // Add the new message to the messages array
          setMessages((prev) => [
            ...prev,
            {
              id: newMessage.id,
              body: newMessage.body,
              role: newMessage.role,
              created_at: newMessage.created_at,
              sender: {
                id: newMessage.sender_user_id,
                display_name: newMessage.role === "counselor" ? "カウンセラー" : "クライアント",
              },
            },
          ]);
        }
      )
      .subscribe();

    console.log(`Subscribed to realtime messages for chat: ${chatId}`);

    // Cleanup subscription on unmount or when chatId changes
    return () => {
      console.log(`Unsubscribing from chat: ${chatId}`);
      supabase.removeChannel(channel);
    };
  }, [selectedBookingId, bookings]);

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
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-6 py-8 sm:py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.3em] text-rose-500">COUNSELOR DASHBOARD</p>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">カウンセラーダッシュボード</h1>
        <p className="text-sm text-slate-500">予約、チャット、プロフィールをここから管理できます。</p>
      </header>

      {error && <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-600">{error}</p>}

      {earnings && earningsStats && (
        <section className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white/90 p-4 sm:p-6 shadow-xl shadow-slate-200/70">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-green-500">売り上げ管理</p>
              <h2 className="text-xl font-black text-slate-900">収益統計</h2>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4">
              <p className="text-xs text-green-600 font-medium">総売上</p>
              <p className="text-2xl font-black text-green-700 mt-1">
                ¥{(earnings.total / 100).toLocaleString()}
              </p>
              <p className="text-xs text-green-600 mt-1">{earningsStats.paidBookings}件の予約</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-xs text-blue-600 font-medium">今月の売上</p>
              <p className="text-2xl font-black text-blue-700 mt-1">
                ¥{(earnings.thisMonth / 100).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-yellow-100 bg-yellow-50/50 p-4">
              <p className="text-xs text-yellow-600 font-medium">未決済</p>
              <p className="text-2xl font-black text-yellow-700 mt-1">
                ¥{(earnings.pending / 100).toLocaleString()}
              </p>
              <p className="text-xs text-yellow-600 mt-1">{earningsStats.pendingBookings}件</p>
            </div>
            <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
              <p className="text-xs text-purple-600 font-medium">完了予約</p>
              <p className="text-2xl font-black text-purple-700 mt-1">
                {earningsStats.completedBookings}
              </p>
              <p className="text-xs text-purple-600 mt-1">全{earningsStats.totalBookings}件中</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">月別売上（直近6ヶ月）</h3>
            <div className="space-y-2">
              {earnings.monthly.map((item) => {
                const maxEarnings = Math.max(...earnings.monthly.map(m => m.earnings), 1);
                const percentage = (item.earnings / maxEarnings) * 100;
                return (
                  <div key={item.month} className="flex items-center gap-3">
                    <p className="text-xs text-slate-600 w-20">{item.month}</p>
                    <div className="flex-1 h-8 bg-white rounded-lg overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-end px-2"
                        style={{ width: `${percentage}%` }}
                      >
                        {item.earnings > 0 && (
                          <span className="text-xs font-bold text-white">
                            ¥{(item.earnings / 100).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {profile && (
        <section className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white/90 p-4 sm:p-6 shadow-xl shadow-slate-200/70">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
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
                <label className="block text-sm font-medium text-slate-700 mb-1">アバター画像</label>
                <div className="flex items-center gap-4">
                  {profileForm.avatar_url && (
                    <img
                      src={profileForm.avatar_url}
                      alt="Preview"
                      className="h-16 w-16 rounded-full object-cover border border-slate-200"
                    />
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-purple-50 file:text-purple-700
                        hover:file:bg-purple-100
                        disabled:opacity-50"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {uploadingAvatar ? "アップロード中..." : "JPEG、PNG、WebP形式、最大5MB"}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">またはURLを直接入力</label>
                  <input
                    type="url"
                    value={profileForm.avatar_url}
                    onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">自己紹介</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base md:text-sm"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">提供プラン</label>
                <div className="space-y-2">
                  {Object.values(COUNSELOR_PLAN_CONFIGS).map((plan) => {
                    const enabled = planSettings[plan.id];
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => togglePlanSetting(plan.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                          enabled
                            ? "border-purple-300 bg-purple-50 text-slate-900"
                            : "border-slate-200 bg-white text-slate-600 hover:border-purple-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold">{plan.title}</p>
                            <p className="text-xs text-slate-500">{plan.subtitle}</p>
                          </div>
                          <p className="text-base font-bold text-slate-900">¥{plan.priceYen.toLocaleString()}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{plan.description}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">※ 少なくとも1つのプランを有効にしてください。</p>
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
                <p className="text-xs font-semibold text-slate-500 mb-1">提供プラン</p>
                <div className="space-y-1">
                  {(() => {
                    const selection = normalizePlanSelection(profile.profile_metadata);
                    const enabled = Object.values(COUNSELOR_PLAN_CONFIGS).filter((plan) => selection[plan.id]);
                    if (enabled.length === 0) {
                      return <p className="text-xs text-slate-500">未設定</p>;
                    }
                    return enabled.map((plan) => (
                      <span
                        key={plan.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                      >
                        <span>{plan.title}</span>
                        <span className="font-semibold">¥{plan.priceYen.toLocaleString()}</span>
                      </span>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {profile && (
        <section className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white/90 p-4 sm:p-6 shadow-xl shadow-slate-200/70">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-semibold text-blue-500">予約枠管理</p>
              <h2 className="text-xl font-black text-slate-900">予約可能時間の設定</h2>
            </div>
          </div>
          
          <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-3">新規枠の追加</h3>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 sm:items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-slate-500 mb-1">日付</label>
                <input
                  type="date"
                  value={slotForm.date}
                  onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs text-slate-500 mb-1">開始時間</label>
                <input
                  type="time"
                  value={slotForm.startTime}
                  onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs text-slate-500 mb-1">終了時間</label>
                <input
                  type="time"
                  value={slotForm.endTime}
                  onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleAddSlot}
                disabled={!slotForm.date || !slotForm.startTime || !slotForm.endTime}
                className="w-full sm:w-auto rounded-full bg-blue-500 px-6 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">現在の予約枠</h3>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {mySlots.map((slot) => (
                <div key={slot.id} className={`p-3 rounded-xl border ${slot.status === 'available' ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-200 opacity-70'}`}>
                  <p className="text-xs font-bold text-slate-700">
                    {new Date(slot.start_time).toLocaleDateString("ja-JP")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(slot.start_time).toLocaleTimeString("ja-JP", { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.end_time).toLocaleTimeString("ja-JP", { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="mt-2 text-xs">
                    ステータス: <span className={slot.status === 'available' ? 'text-green-600' : 'text-slate-500'}>{slot.status}</span>
                  </p>
                  {slot.status === 'available' && (
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="mt-2 w-full rounded-md border border-rose-200 bg-rose-50 py-1 text-xs text-rose-600 hover:bg-rose-100"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
              {mySlots.length === 0 && (
                <p className="col-span-full text-sm text-slate-500 text-center py-4">登録された枠はありません。</p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="space-y-3 md:sticky md:top-4 md:self-start">
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
                <p className="text-[11px] text-slate-400">
                  {COUNSELOR_PLAN_CONFIGS[booking.plan_type].title} · {booking.status} · {booking.payment_status}
                </p>
              </button>
            ))}
            {bookings.length === 0 && <p className="text-xs text-slate-400">現在表示する予約はありません。</p>}
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white/90 p-4 sm:p-5 shadow-xl shadow-slate-200/70">
          {selectedBooking ? (
            <div className="flex h-full min-h-[500px] flex-col gap-4">
              <div>
                <p className="text-xs font-semibold text-rose-500">選択中の予約</p>
                <h2 className="text-xl font-black text-slate-900">
                  {selectedBooking.client?.display_name ?? "非公開"}
                </h2>
                <p className="text-sm text-slate-500">{new Date(selectedBooking.start_time).toLocaleString("ja-JP")}</p>
                <p className="text-xs text-slate-400">
                  {selectedBooking.status} · {selectedBooking.payment_status}
                </p>
                <p className="text-xs text-slate-500">
                  プラン: {COUNSELOR_PLAN_CONFIGS[selectedBooking.plan_type].title}
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
                        className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-base md:text-sm focus:border-rose-200 focus:outline-none"
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
