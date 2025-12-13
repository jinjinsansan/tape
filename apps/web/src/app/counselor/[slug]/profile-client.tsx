"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarDays, Video, Clock } from "lucide-react";
import {
  COUNSELOR_PLAN_CONFIGS,
  normalizePlanSelection,
  CounselorPlanType
} from "@/constants/counselor-plans";

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

export function CounselorPage({ slug }: { slug: string }) {
  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CounselorPlanType | null>(null);
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

  const planSelection = useMemo(() => normalizePlanSelection(counselor?.profile_metadata), [counselor]);

  const availablePlans = useMemo(
    () => Object.values(COUNSELOR_PLAN_CONFIGS).filter((plan) => planSelection[plan.id]),
    [planSelection]
  );

  useEffect(() => {
    if (availablePlans.length === 0) {
      setSelectedPlan(null);
      return;
    }
    if (!selectedPlan || !planSelection[selectedPlan]) {
      setSelectedPlan(availablePlans[0].id);
    }
  }, [availablePlans, planSelection, selectedPlan]);

  const activePlan = selectedPlan ? COUNSELOR_PLAN_CONFIGS[selectedPlan] : null;

  const handleBook = async () => {
    if (!selectedSlotId) {
      setError("予約枠を選択してください");
      return;
    }
    if (!selectedPlan) {
      setError("プランを選択してください");
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
        body: JSON.stringify({ slotId: selectedSlotId, notes, planType: selectedPlan })
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
      <main className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-tape-light-brown">
        プロフィールを読み込んでいます...
      </main>
    );
  }

  if (!counselor || error && !booking) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-tape-pink">
        {error ?? "カウンセラー情報が見つかりませんでした。"}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8">
      <Card className="border-tape-beige shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-6">
                <img
                  src={counselor.avatar_url ?? "https://placehold.co/100x100/F5F2EA/5C554F?text=User"}
                  alt={counselor.display_name}
                  className="h-24 w-24 rounded-full object-cover border border-tape-beige"
                />
                <div>
                  <p className="text-xs font-semibold text-tape-green mb-1 tracking-wider">TAPE COUNSELOR</p>
                  <h1 className="text-3xl font-bold text-tape-brown">{counselor.display_name}</h1>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {counselor.specialties?.map((spec) => (
                      <span key={spec} className="inline-flex items-center rounded-full bg-tape-cream px-2.5 py-0.5 text-xs font-medium text-tape-brown">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <p className="text-sm leading-relaxed text-tape-brown/90 whitespace-pre-wrap">{counselor.bio}</p>
              
              <div className="flex flex-wrap gap-2 text-xs text-tape-light-brown font-medium">
                <span className="flex items-center gap-1 rounded-full bg-tape-beige/50 px-3 py-1">
                  <Video className="h-3 w-3" /> オンライン / Tapeチャット
                </span>
                {availablePlans.map((plan) => (
                  <span
                    key={`${counselor.id}-${plan.id}`}
                    className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-tape-brown border border-tape-beige"
                  >
                    <Clock className="h-3 w-3" /> {plan.title} ¥{plan.priceYen.toLocaleString()}
                  </span>
                ))}
              </div>

              {counselor.intro_video_url && (
                <div className="aspect-video w-full overflow-hidden rounded-3xl border border-tape-beige shadow-inner bg-black/5">
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

            <div className="w-full lg:max-w-sm space-y-4">
              <div className="rounded-3xl border border-tape-beige bg-white/80 p-6">
                <h2 className="text-sm font-bold text-tape-brown mb-4">プランを選択</h2>
                {availablePlans.length === 0 ? (
                  <p className="text-xs text-tape-light-brown">現在販売中のプランがありません。カウンセラーにお問い合わせください。</p>
                ) : (
                  <div className="space-y-3">
                    {availablePlans.map((plan) => {
                      const isActive = selectedPlan === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlan(plan.id)}
                          className={cn(
                            "w-full rounded-2xl border px-4 py-3 text-left transition-all",
                            isActive
                              ? "border-tape-pink bg-[#fff6f8] text-tape-brown shadow-sm"
                              : "border-tape-beige bg-white text-tape-brown hover:bg-tape-cream"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-tape-brown">{plan.title}</p>
                              <p className="text-[11px] text-tape-light-brown">{plan.subtitle}</p>
                            </div>
                            <p className="text-lg font-bold text-tape-brown">¥{plan.priceYen.toLocaleString()}</p>
                          </div>
                          <p className="mt-2 text-xs text-tape-brown/80">{plan.description}</p>
                          <ul className="mt-2 list-disc list-inside text-[11px] text-tape-light-brown">
                            {plan.highlights.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-tape-beige bg-tape-cream/30 p-6">
                <h2 className="flex items-center gap-2 text-sm font-bold text-tape-brown mb-4">
                  <CalendarDays className="h-4 w-4 text-tape-orange" />
                  初回の予約日時を選ぶ
                </h2>

                {activePlan && (
                  <p className="mb-3 text-xs text-tape-brown">
                    選択中のプラン: <span className="font-semibold">{activePlan.title}</span> / ¥
                    {activePlan.priceYen.toLocaleString()}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  {slots.slice(0, 6).map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      disabled={!activePlan}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition-all",
                        selectedSlotId === slot.id
                          ? "border-tape-orange bg-tape-orange/10 text-tape-brown shadow-sm"
                          : "border-tape-beige bg-white hover:bg-white/80 text-tape-brown",
                        !activePlan && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <p className="font-bold text-sm">{formatDateTime(slot.start_time)}</p>
                      <p className="text-xs text-tape-light-brown mt-0.5">{formatDateTime(slot.end_time)} まで</p>
                    </button>
                  ))}
                  {slots.length === 0 && (
                    <p className="text-xs text-tape-light-brown text-center py-4">現在、予約可能な枠がありません。</p>
                  )}
                </div>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="w-full h-24 rounded-xl border border-tape-beige bg-white px-4 py-3 text-base md:text-sm text-tape-brown focus:border-tape-orange focus:outline-none focus:ring-1 focus:ring-tape-orange resize-none"
                  placeholder="ご相談内容や目的を入力"
                  disabled={!isAuthenticated}
                />

                {!isAuthenticated && (
                  <p className="mt-3 text-xs text-tape-pink text-center font-medium">ログインすると予約できます。</p>
                )}

                <Button
                  onClick={handleBook}
                  disabled={!selectedSlot || !isAuthenticated || pendingAction || !activePlan}
                  className="mt-4 w-full bg-tape-brown text-white hover:bg-tape-brown/90"
                >
                  {activePlan?.id === "monthly_course" ? "1ヶ月コースを申込む" : "単発セッションを予約"}
                </Button>

                {activePlan?.id === "monthly_course" && (
                  <p className="mt-2 text-[11px] text-tape-light-brown">
                    ※ 選択した日時は1ヶ月コースの初回セッションとして確定します。
                  </p>
                )}

                {booking && booking.status === "pending" && (
                  <Button
                    variant="outline"
                    onClick={handleConfirm}
                    disabled={pendingAction}
                    className="mt-2 w-full border-tape-brown text-tape-brown hover:bg-tape-beige"
                  >
                    ウォレットで支払う
                  </Button>
                )}
              </div>
            </div>
          </div>
          {error && <p className="mt-4 text-xs text-tape-pink text-center font-medium">{error}</p>}
          {success && <p className="mt-4 text-xs text-tape-green text-center font-medium">{success}</p>}
        </CardContent>
      </Card>

      {chatId && (
        <Card className="border-tape-beige shadow-sm">
          <CardContent className="p-6">
            <header className="flex items-center justify-between mb-6 border-b border-tape-beige pb-4">
              <div>
                <p className="text-xs font-semibold text-tape-orange mb-1">INTRO CHAT</p>
                <h2 className="text-xl font-bold text-tape-brown">初回チャット</h2>
              </div>
              <Button variant="outline" size="sm" onClick={loadChatMessages} className="text-tape-light-brown">
                更新
              </Button>
            </header>
            
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-1",
                    message.role === "counselor" ? "items-start" : "items-end"
                  )}
                >
                  <div className="flex items-center gap-2 text-[10px] text-tape-light-brown px-1">
                    <span>{message.sender_profile?.display_name ?? (message.role === "counselor" ? counselor.display_name : "あなた")}</span>
                    <span>{new Date(message.created_at).toLocaleString("ja-JP")}</span>
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      message.role === "counselor"
                        ? "bg-white border border-tape-beige text-tape-brown"
                        : "bg-tape-orange/10 text-tape-brown border border-tape-orange/20"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="挨拶や相談内容を送ってください"
                className="flex-1 rounded-2xl border border-tape-beige bg-tape-cream/50 px-4 py-3 text-base md:text-sm focus:border-tape-orange focus:outline-none focus:ring-1 focus:ring-tape-orange resize-none h-14"
              />
              <Button
                onClick={handleSendMessage}
                disabled={pendingAction || !chatInput.trim()}
                className="h-14 px-6 bg-tape-orange text-white hover:bg-tape-orange/90 rounded-2xl"
              >
                送信
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-3xl border border-tape-beige bg-white/50 p-6 text-xs text-tape-light-brown text-center">
        <p>※ 予約確定後の24時間以内キャンセルは50%のキャンセル料が発生します。ウォレット残高が不足している場合は事前にチャージしてください。</p>
        <p className="mt-1">※ カウンセラー都合でキャンセルになった場合は自動的に全額返金されます。</p>
      </div>
    </main>
  );
}
