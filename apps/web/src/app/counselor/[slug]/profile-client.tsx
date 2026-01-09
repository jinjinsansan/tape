"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CounselorReviewStatus } from "@tape/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarDays, Video, Clock, MessageCircle, ExternalLink, Star } from "lucide-react";
import {
  COUNSELOR_PLAN_CONFIGS,
  normalizePlanSelection,
  CounselorPlanType
} from "@/constants/counselor-plans";
import { normalizeYouTubeEmbedUrl } from "@/lib/youtube";
import { extractCounselorSocialLinks } from "@/lib/counselor-metadata";

const REVIEW_PAGE_SIZE = 5;

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
  accepting_bookings: boolean;
};

type Booking = {
  id: string;
  status: string;
  price_cents: number;
  payment_status?: string;
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

type CounselorReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: CounselorReviewStatus;
  isViewerReview: boolean;
  reviewer: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

type ReviewSummary = {
  average: number;
  totalCount: number;
  breakdown: Record<string, number>;
};

export function CounselorPage({ slug }: { slug: string }) {
  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<CounselorPlanType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingAction, setPendingAction] = useState(false);
  const [reviews, setReviews] = useState<CounselorReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [reviewCursor, setReviewCursor] = useState<string | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/counselors/${slug}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("カウンセラーが見つかりませんでした。");
        }
        throw new Error("プロフィールの読み込みに失敗しました");
      }
      const data = await res.json();
      setCounselor(data.counselor);
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

  const loadReviews = useCallback(
    async (mode: "initial" | "append" = "initial", cursorValue: string | null = null) => {
      if (!slug) return;
      if (mode === "append" && !cursorValue) return;

      if (mode === "initial") {
        setReviewsLoading(true);
        setReviewsError(null);
      }

      try {
        const params = new URLSearchParams({ limit: String(REVIEW_PAGE_SIZE) });
        if (mode === "append" && cursorValue) params.set("cursor", cursorValue);
        const res = await fetch(`/api/counselors/${slug}/reviews?${params.toString()}`);
        if (!res.ok) {
          throw new Error("口コミの読み込みに失敗しました");
        }
        const data = await res.json();
        setReviewSummary(data.summary ?? null);
        setCanReview(Boolean(data.canReview));
        setReviewCursor(data.nextCursor ?? null);
        setHasMoreReviews(Boolean(data.nextCursor));
        setReviews((prev) => (mode === "append" ? [...prev, ...(data.reviews ?? [])] : data.reviews ?? []));
      } catch (err) {
        console.error(err);
        setReviewsError(err instanceof Error ? err.message : "口コミの読み込みに失敗しました");
      } finally {
        setReviewsLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    loadReviews("initial");
  }, [loadReviews]);

  const planSelection = useMemo(() => normalizePlanSelection(counselor?.profile_metadata), [counselor]);
  const socialLinks = useMemo(() => extractCounselorSocialLinks(counselor?.profile_metadata), [counselor?.profile_metadata]);
  const hasSocialLinks = Boolean(socialLinks.line || socialLinks.x || socialLinks.instagram);

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
  const embedVideoUrl = useMemo(
    () => normalizeYouTubeEmbedUrl(counselor?.intro_video_url ?? null),
    [counselor?.intro_video_url]
  );

  const handleBookingAction = async (payNow: boolean) => {
    if (pendingAction) {
      return;
    }
    if (!isAuthenticated) {
      setError("ログイン後にご利用ください");
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
        body: JSON.stringify({ planType: selectedPlan, notes: null, payNow })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "予約に失敗しました");
      }
      const data = await res.json();
      setBooking(data.booking);
      setChatId(data.chatId);
      setSuccess(
        payNow
          ? "ウォレット決済が完了しました。カウンセラーと日程をご調整ください。"
          : "初回チャットルームを作成しました。チャットやSNSで日程をご相談ください。"
      );
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

  const handleReviewSubmit = useCallback(async () => {
    if (!canReview) return;
    if (!reviewForm.comment.trim()) {
      setReviewMessage("口コミの内容を入力してください");
      return;
    }
    setSubmittingReview(true);
    setReviewMessage(null);
    try {
      const res = await fetch(`/api/counselors/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewForm.rating, comment: reviewForm.comment.trim() })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "レビューの投稿に失敗しました");
      }
      setReviewForm({ rating: 5, comment: "" });
      setReviewMessage("レビューを投稿しました（審査中です）");
      await loadReviews("initial");
    } catch (err) {
      setReviewMessage(err instanceof Error ? err.message : "レビューの投稿に失敗しました");
    } finally {
      setSubmittingReview(false);
    }
  }, [canReview, reviewForm, slug, loadReviews]);

  const handleDeleteReview = useCallback(
    async (reviewId: string) => {
      if (!confirm("このレビューを削除しますか？")) return;
      try {
        const res = await fetch(`/api/counselors/${slug}/reviews/${reviewId}`, { method: "DELETE" });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.error ?? "レビューの削除に失敗しました");
        }
        setReviewMessage("レビューを削除しました");
        await loadReviews("initial");
      } catch (err) {
        setReviewMessage(err instanceof Error ? err.message : "レビューの削除に失敗しました");
      }
    },
    [slug, loadReviews]
  );

  const handleLoadMoreReviews = () => {
    if (hasMoreReviews) {
      loadReviews("append", reviewCursor);
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

              {embedVideoUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-3xl border border-tape-beige shadow-inner bg-black/5">
                  <iframe
                    src={embedVideoUrl}
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

              <div className="rounded-3xl border border-tape-beige bg-tape-cream/30 p-6 space-y-4">
                <h2 className="flex items-center gap-2 text-sm font-bold text-tape-brown">
                  <CalendarDays className="h-4 w-4 text-tape-orange" /> ご相談の流れ
                </h2>

                {activePlan && (
                  <p className="text-xs text-tape-brown">
                    選択中のプラン: <span className="font-semibold">{activePlan.title}</span> / ¥{activePlan.priceYen.toLocaleString()}
                  </p>
                )}

                <ol className="space-y-2 text-xs text-tape-brown">
                  <li className="flex gap-2">
                    <span className="font-bold text-tape-orange">①</span>
                    Tapeチャットで初回の相談を始めてください。
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-tape-orange">②</span>
                    必要に応じてLINE / X / InstagramなどSNSで連絡し、日程や詳細を調整します。
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-tape-orange">③</span>
                    ウォレット決済でプランを確定すると正式な予約が完了します。
                  </li>
                </ol>

                {hasSocialLinks && (
                  <div className="rounded-2xl border border-tape-beige bg-white/80 p-4 space-y-3">
                    <p className="text-xs font-semibold text-tape-brown flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-tape-orange" /> SNSでも相談できます
                    </p>
                    <div className="space-y-2">
                      {socialLinks.line && (
                        <a
                          href={socialLinks.line}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-2xl border border-tape-green/40 bg-tape-green/5 px-4 py-3 text-sm font-semibold text-tape-brown hover:bg-tape-green/10"
                        >
                          LINEで連絡
                          <ExternalLink className="h-4 w-4 text-tape-green" />
                        </a>
                      )}
                      {socialLinks.x && (
                        <a
                          href={socialLinks.x}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-2xl border border-tape-brown/30 bg-white px-4 py-3 text-sm font-semibold text-tape-brown hover:bg-tape-cream"
                        >
                          X（Twitter）で連絡
                          <ExternalLink className="h-4 w-4 text-tape-brown" />
                        </a>
                      )}
                      {socialLinks.instagram && (
                        <a
                          href={socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-2xl border border-tape-pink/40 bg-tape-pink/5 px-4 py-3 text-sm font-semibold text-tape-brown hover:bg-tape-pink/10"
                        >
                          Instagramで連絡
                          <ExternalLink className="h-4 w-4 text-tape-pink" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {!isAuthenticated && (
                  <p className="text-xs text-tape-pink text-center font-medium">ログインするとチャット/決済をご利用いただけます。</p>
                )}

                {counselor && !counselor.accepting_bookings && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                    <p className="text-sm font-bold text-amber-700">受付停止中</p>
                    <p className="text-xs text-amber-600 mt-1">現在このカウンセラーは新規予約を受け付けておりません。</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={() => handleBookingAction(false)}
                    disabled={!isAuthenticated || pendingAction || !activePlan || (counselor && !counselor.accepting_bookings)}
                    className="w-full bg-tape-brown text-white hover:bg-tape-brown/90 disabled:opacity-50"
                  >
                    チャットで相談を始める
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleBookingAction(true)}
                    disabled={!isAuthenticated || pendingAction || !activePlan || (counselor && !counselor.accepting_bookings)}
                    className="w-full border-tape-orange text-tape-orange hover:bg-tape-orange/5 disabled:opacity-50"
                  >
                    ウォレットで即時決済する
                  </Button>
                </div>

                {booking && booking.status === "pending" && booking.payment_status !== "paid" && (
                  <Button
                    variant="outline"
                    onClick={handleConfirm}
                    disabled={pendingAction}
                    className="w-full border-tape-brown text-tape-brown hover:bg-tape-beige"
                  >
                    ウォレットで支払う
                  </Button>
                )}

                <p className="text-[11px] text-tape-light-brown text-center">
                  ※ まずはチャットやSNSで連絡し、カウンセラーと日程・方法をご相談ください。
                </p>
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

      <Card className="border-tape-beige shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-tape-orange mb-1">REVIEWS</p>
              <h2 className="text-xl font-bold text-tape-brown">口コミ</h2>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-4xl font-black text-tape-brown">
                  {reviewSummary ? reviewSummary.average.toFixed(1) : "-"}
                </span>
                <RatingStars value={reviewSummary?.average ?? 0} />
              </div>
              <p className="text-xs text-tape-light-brown mt-1">
                {reviewSummary?.totalCount ?? 0}件のレビュー
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-tape-light-brown">
              {reviewSummary &&
                [5, 4, 3, 2, 1].map((score) => (
                  <div key={score} className="flex items-center gap-2 rounded-full bg-tape-cream/60 px-3 py-1">
                    <span className="font-semibold text-tape-brown">{score}★</span>
                    <span>{reviewSummary.breakdown[String(score)] ?? 0}</span>
                  </div>
                ))}
            </div>
          </div>

          {reviewMessage && (
            <p className="text-xs text-center text-tape-pink">{reviewMessage}</p>
          )}

          {isAuthenticated ? (
            canReview ? (
              <div className="rounded-3xl border border-tape-beige bg-tape-cream/40 p-4 space-y-4">
                <p className="text-sm font-bold text-tape-brown">レビューを投稿する</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-tape-light-brown">評価</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewForm((prev) => ({ ...prev, rating: value }))}
                        className={cn(
                          "p-1",
                          value <= reviewForm.rating ? "text-tape-pink" : "text-tape-beige"
                        )}
                        aria-label={`星${value}`}
                      >
                        <Star
                          className={cn(
                            "h-5 w-5",
                            value <= reviewForm.rating ? "fill-tape-pink text-tape-pink" : "text-tape-beige"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={reviewForm.comment}
                  onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                  placeholder="感想やおすすめポイントを教えてください"
                  className="w-full rounded-2xl border border-tape-beige bg-white px-4 py-3 text-sm text-tape-brown focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink"
                  rows={4}
                />
                <Button
                  onClick={handleReviewSubmit}
                  disabled={submittingReview}
                  className="w-full bg-tape-pink text-white hover:bg-tape-pink/90"
                >
                  {submittingReview ? "送信中..." : "レビューを投稿"}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-center text-tape-light-brown">
                予約を完了した後にレビューを投稿できます。
              </p>
            )
          ) : (
            <p className="text-xs text-center text-tape-pink">ログインするとレビューを投稿できます。</p>
          )}

          <div className="space-y-4">
            {reviewsLoading ? (
              <p className="text-sm text-tape-light-brown text-center">口コミを読み込み中...</p>
            ) : reviewsError ? (
              <p className="text-sm text-tape-pink text-center">{reviewsError}</p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-tape-light-brown text-center">まだ口コミがありません。</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-3xl border border-tape-beige bg-white/90 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <img
                      src={review.reviewer?.avatar_url ?? "https://placehold.co/40x40/F5F2EA/5C554F?text=User"}
                      alt={review.reviewer?.display_name ?? "匿名"}
                      className="h-10 w-10 rounded-full object-cover border border-tape-beige"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-tape-brown">
                        {review.reviewer?.display_name ?? "匿名ユーザー"}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-tape-light-brown">
                        <span>{new Date(review.createdAt).toLocaleDateString("ja-JP")}</span>
                        {review.status !== "approved" && (
                          <span className="rounded-full bg-tape-orange/10 px-2 py-0.5 text-[10px] text-tape-orange">
                            審査中
                          </span>
                        )}
                      </div>
                    </div>
                    <RatingStars value={review.rating} />
                    {review.isViewerReview && (
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-[11px] text-tape-pink hover:underline"
                      >
                        削除
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-tape-brown whitespace-pre-wrap">{review.comment}</p>
                </div>
              ))
            )}
          </div>

          {hasMoreReviews && (
            <Button
              variant="outline"
              onClick={handleLoadMoreReviews}
              className="w-full border-tape-beige text-tape-light-brown"
            >
              もっと見る
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="rounded-3xl border border-tape-beige bg-white/50 p-6 text-xs text-tape-light-brown text-center">
        <p>※ TapeチャットやSNSで日程を調整した後、ウォレット決済で確定となります。</p>
        <p className="mt-1">※ 確定後24時間以内のキャンセルは50%のキャンセル料が発生します。</p>
        <p className="mt-1">※ カウンセラー都合でキャンセルになった場合は自動的に全額返金されます。</p>
      </div>
    </main>
  );
}

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`rating-${value}`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "h-4 w-4",
            index + 1 <= Math.round(value) ? "fill-tape-pink text-tape-pink" : "text-tape-beige"
          )}
        />
      ))}
    </div>
  );
}
