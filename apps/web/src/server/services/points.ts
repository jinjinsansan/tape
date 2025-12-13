import type { Database, Json } from "@tape/supabase";

import { getSupabaseAdminClient } from "@/server/supabase";

type PointAction = Database["public"]["Enums"]["point_action"];
type PointRuleRow = Database["public"]["Tables"]["point_award_rules"]["Row"];
type PointEventRow = Database["public"]["Tables"]["point_events"]["Row"];
type PointRewardRow = Database["public"]["Tables"]["point_rewards"]["Row"];
type PointRedemptionRow = Database["public"]["Tables"]["point_redemptions"]["Row"];

type PointRewardInput = {
  title: string;
  cost_points: number;
  description?: string | null;
  image_url?: string | null;
  stock?: number | null;
  is_active?: boolean;
  metadata?: Json;
};

const admin = () => getSupabaseAdminClient();

export const fetchPointRules = async () => {
  const supabase = admin();
  const { data, error } = await supabase
    .from("point_award_rules")
    .select("*")
    .order("action", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as PointRuleRow[];
};

export const updatePointRule = async (
  action: PointAction,
  payload: Partial<Pick<PointRuleRow, "points" | "description" | "is_active">>,
  adminUserId?: string
) => {
  const supabase = admin();
  const { data, error } = await supabase
    .from("point_award_rules")
    .update({
      ...(payload.points !== undefined ? { points: payload.points } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
      updated_by: adminUserId ?? null
    })
    .eq("action", action)
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return data as PointRuleRow;
};

export const awardPoints = async (params: {
  userId: string;
  action: PointAction;
  referenceId?: string;
  metadata?: Json;
}) => {
  const supabase = admin();
  const { data, error } = await supabase.rpc("award_points", {
    p_user_id: params.userId,
    p_action: params.action,
    p_reference_id: params.referenceId ?? null,
    p_metadata: (params.metadata ?? null) as Json | null
  });
  if (error) {
    throw error;
  }
  return data as PointEventRow | null;
};

export const listPointEvents = async (userId: string, limit = 20) => {
  const supabase = admin();
  const { data, error } = await supabase
    .from("point_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw error;
  }
  return (data ?? []) as PointEventRow[];
};

export const listActiveRewards = async () => {
  const supabase = admin();
  const { data, error } = await supabase
    .from("point_rewards")
    .select("*")
    .eq("is_active", true)
    .order("cost_points", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as PointRewardRow[];
};

export const listAllRewards = async () => {
  const supabase = admin();
  const { data, error } = await supabase
    .from("point_rewards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as PointRewardRow[];
};

export const createPointReward = async (payload: PointRewardInput) => {
  const supabase = admin();
  const { data, error } = await supabase
    .from("point_rewards")
    .insert({
      title: payload.title,
      cost_points: payload.cost_points,
      description: payload.description ?? null,
      image_url: payload.image_url ?? null,
      stock: payload.stock ?? null,
      is_active: payload.is_active ?? true,
      metadata: payload.metadata ?? {}
    })
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return data as PointRewardRow;
};

export const updatePointReward = async (
  rewardId: string,
  payload: Partial<PointRewardInput>
) => {
  const supabase = admin();
  const { data, error } = await supabase
    .from("point_rewards")
    .update({
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.image_url !== undefined ? { image_url: payload.image_url } : {}),
      ...(payload.cost_points !== undefined ? { cost_points: payload.cost_points } : {}),
      ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
      ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {})
    })
    .eq("id", rewardId)
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return data as PointRewardRow;
};

export const redeemReward = async (params: {
  userId: string;
  rewardId: string;
  quantity?: number;
  metadata?: Json;
}) => {
  const supabase = admin();
  const { data, error } = await supabase.rpc("redeem_points", {
    p_user_id: params.userId,
    p_reward_id: params.rewardId,
    p_quantity: params.quantity ?? 1,
    p_metadata: (params.metadata ?? null) as Json | null
  });
  if (error) {
    throw error;
  }
  return data as PointRedemptionRow;
};

export const listRedemptions = async (userId: string, limit = 20) => {
  const supabase = admin();
  const { data, error } = await supabase
    .from("point_redemptions")
    .select("*, reward:point_rewards(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw error;
  }
  return (data ?? []) as (PointRedemptionRow & { reward: PointRewardRow | null })[];
};

export const listAllRedemptions = async (limit = 50) => {
  const supabase = admin();
  
  // ビューを使用してprofilesとのリレーションシップ問題を回避
  const { data: viewData, error: viewError } = await supabase
    .from("admin_point_redemptions_view")
    .select("*")
    .limit(limit);
  
  if (viewError) {
    // フォールバック: ビューが利用できない場合は別々にクエリ
    console.warn("[listAllRedemptions] View query failed, using fallback:", viewError);
    
    const { data, error } = await supabase
      .from("point_redemptions")
      .select("*, reward:point_rewards(*)")
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    // ユーザー情報を別途取得
    const userIds = [...new Set(data?.map(d => d.user_id) ?? [])];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    
    if (profilesError) {
      console.error("[listAllRedemptions] Failed to fetch profiles:", profilesError);
    }
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);
    
    return (data ?? []).map(d => ({
      ...d,
      user: profileMap.get(d.user_id) ?? null
    })) as (PointRedemptionRow & {
      reward: PointRewardRow | null;
      user: { id: string; display_name: string | null } | null;
    })[];
  }
  
  // ビューから正常にデータを取得できた場合
  return (viewData ?? []) as (PointRedemptionRow & {
    reward: PointRewardRow | null;
    user: { id: string; display_name: string | null } | null;
  })[];
};

export const fetchPointAnalytics = async (days = 30) => {
  const supabase = admin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [totalsResult, actionBreakdownResult, redemptionBreakdownResult, transactionsResult, recentRedemptionsResult] =
    await Promise.all([
      supabase.rpc("admin_point_totals").single(),
      supabase.rpc("admin_point_action_breakdown"),
      supabase.rpc("admin_point_redemption_breakdown"),
      supabase
        .from("transactions")
        .select("id, type, amount_cents, created_at")
        .in("type", ["topup", "consume"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("point_redemptions")
        .select("id, points_spent, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300)
    ]);

  if (totalsResult.error) throw totalsResult.error;
  if (actionBreakdownResult.error) throw actionBreakdownResult.error;
  if (redemptionBreakdownResult.error) throw redemptionBreakdownResult.error;
  if (transactionsResult.error) throw transactionsResult.error;
  if (recentRedemptionsResult.error) throw recentRedemptionsResult.error;

  const seriesMap = new Map<string, { topup: number; consume: number; redemption: number }>();

  (transactionsResult.data ?? []).forEach((tx) => {
    const key = tx.created_at.slice(0, 10);
    const bucket = seriesMap.get(key) ?? { topup: 0, consume: 0, redemption: 0 };
    if (tx.type === "topup") bucket.topup += tx.amount_cents;
    if (tx.type === "consume") bucket.consume += tx.amount_cents;
    seriesMap.set(key, bucket);
  });

  (recentRedemptionsResult.data ?? []).forEach((redeem) => {
    const key = redeem.created_at.slice(0, 10);
    const bucket = seriesMap.get(key) ?? { topup: 0, consume: 0, redemption: 0 };
    bucket.redemption += redeem.points_spent;
    seriesMap.set(key, bucket);
  });

  const revenueSeries = Array.from(seriesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, bucket]) => ({
      date,
      topupCents: bucket.topup,
      consumeCents: bucket.consume,
      redemptionPoints: bucket.redemption
    }));

  const recentTopups = (transactionsResult.data ?? [])
    .filter((tx) => tx.type === "topup")
    .slice(0, 10);

  return {
    totals: totalsResult.data,
    actionBreakdown: actionBreakdownResult.data ?? [],
    redemptionBreakdown: redemptionBreakdownResult.data ?? [],
    revenueSeries,
    recentTopups,
    recentRedemptions: (recentRedemptionsResult.data ?? []).slice(0, 10)
  };
};
