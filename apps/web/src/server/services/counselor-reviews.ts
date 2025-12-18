import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, CounselorReviewStatus } from "@tape/supabase";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getCounselor } from "./counselors";

type Supabase = SupabaseClient<Database>;

const VISIBLE_REVIEW_STATUSES: CounselorReviewStatus[] = ["approved"];

type ReviewListParams = {
  slug: string;
  viewerId: string | null;
  limit?: number;
  cursor?: string | null;
};

const buildReviewerMap = async (supabase: Supabase, reviewerIds: string[]) => {
  if (reviewerIds.length === 0) return new Map<string, Database["public"]["Tables"]["profiles"]["Row"]>();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", reviewerIds);
  const map = new Map<string, Database["public"]["Tables"]["profiles"]["Row"]>();
  (data ?? []).forEach((profile) => {
    map.set(profile.id, profile);
  });
  return map;
};

const getReviewEligibility = async (supabase: Supabase, counselorId: string, userId: string) => {
  const { data: existingReview, error: existingReviewError } = await supabase
    .from("counselor_reviews")
    .select("id")
    .eq("counselor_id", counselorId)
    .eq("reviewer_user_id", userId)
    .maybeSingle();

  if (existingReviewError) {
    throw existingReviewError;
  }
  if (existingReview) {
    return { canReview: false, eligibleBookingId: null };
  }

  const { data: booking, error } = await supabase
    .from("counselor_bookings")
    .select("id, status")
    .eq("counselor_id", counselorId)
    .eq("client_user_id", userId)
    .in("status", ["confirmed", "completed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!booking) {
    return { canReview: false, eligibleBookingId: null };
  }

  return { canReview: true, eligibleBookingId: booking.id };
};

export const listCounselorReviews = async ({ slug, viewerId, limit = 10, cursor = null }: ReviewListParams) => {
  const supabase = getSupabaseAdminClient();
  const counselor = await getCounselor(slug, supabase);

  let query = supabase
    .from("counselor_reviews")
    .select("id, rating, comment, status, is_anonymous, reviewer_user_id, created_at, booking_id")
    .eq("counselor_id", counselor.id)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (viewerId) {
    query = query.or(`status.eq.approved,reviewer_user_id.eq.${viewerId}`);
  } else {
    query = query.eq("status", "approved");
  }

  const { data: reviewRows, error } = await query;
  if (error) {
    throw error;
  }

  const hasMore = (reviewRows?.length ?? 0) > limit;
  const sliced = (reviewRows ?? []).slice(0, limit);
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.created_at ?? null : null;

  const reviewerIds = [...new Set(sliced.map((review) => review.reviewer_user_id))];
  const reviewerMap = await buildReviewerMap(supabase, reviewerIds);

  const reviews = sliced.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.created_at,
    status: review.status,
    isViewerReview: viewerId === review.reviewer_user_id,
    reviewer: reviewerMap.get(review.reviewer_user_id) ?? null
  }));

  const { data: summaryRows, error: summaryError } = await supabase
    .from("counselor_reviews")
    .select("rating")
    .eq("counselor_id", counselor.id)
    .eq("status", "approved");

  if (summaryError) {
    throw summaryError;
  }

  const breakdown: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  summaryRows?.forEach((row) => {
    const key = String(row.rating);
    if (breakdown[key] !== undefined) {
      breakdown[key] += 1;
    }
  });
  const total = summaryRows?.length ?? 0;
  const average = total === 0 ? 0 : (summaryRows?.reduce((sum, row) => sum + row.rating, 0) ?? 0) / total;

  let viewerReview: (typeof reviews)[number] | null = null;
  if (viewerId) {
    const { data: viewerReviewRow } = await supabase
      .from("counselor_reviews")
      .select("id, rating, comment, status, reviewer_user_id, created_at")
      .eq("counselor_id", counselor.id)
      .eq("reviewer_user_id", viewerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (viewerReviewRow) {
      viewerReview = {
        id: viewerReviewRow.id,
        rating: viewerReviewRow.rating,
        comment: viewerReviewRow.comment,
        createdAt: viewerReviewRow.created_at,
        status: viewerReviewRow.status,
        isViewerReview: true,
        reviewer: reviewerMap.get(viewerId) ?? null
      };
    }
  }

  const { canReview, eligibleBookingId } = viewerId
    ? await getReviewEligibility(supabase, counselor.id, viewerId)
    : { canReview: false, eligibleBookingId: null };

  return {
    counselorId: counselor.id,
    reviews,
    nextCursor,
    summary: {
      average,
      totalCount: total,
      breakdown
    },
    viewerReview,
    canReview,
    eligibleBookingId
  };
};

type ReviewPayload = {
  slug: string;
  rating: number;
  comment: string;
  userId: string;
};

export const createCounselorReview = async ({ slug, rating, comment, userId }: ReviewPayload) => {
  if (rating < 1 || rating > 5) {
    throw new Error("評価は1から5の範囲で入力してください。");
  }
  if (!comment.trim()) {
    throw new Error("口コミを入力してください。");
  }

  const supabase = getSupabaseAdminClient();
  const counselor = await getCounselor(slug, supabase);
  const eligibility = await getReviewEligibility(supabase, counselor.id, userId);

  if (!eligibility.canReview || !eligibility.eligibleBookingId) {
    throw new Error("レビューを投稿できる予約が見つかりません。");
  }

  const { data, error } = await supabase
    .from("counselor_reviews")
    .insert({
      counselor_id: counselor.id,
      reviewer_user_id: userId,
      booking_id: eligibility.eligibleBookingId,
      rating,
      comment,
      status: "pending"
    })
    .select("id, rating, comment, status, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const deleteCounselorReview = async (reviewId: string, userId: string) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("counselor_reviews")
    .select("reviewer_user_id")
    .eq("id", reviewId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data || data.reviewer_user_id !== userId) {
    throw new Error("削除できる口コミが見つかりません。");
  }

  const { error: deleteError } = await supabase.from("counselor_reviews").delete().eq("id", reviewId);
  if (deleteError) {
    throw deleteError;
  }
};
