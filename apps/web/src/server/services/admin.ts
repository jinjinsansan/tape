import type { Database, Json } from "@tape/supabase";

import { getSupabaseAdminClient } from "@/server/supabase";
import { consumeWallet, getOrCreateWallet, topUpWallet } from "./wallet";

const adminClient = () => getSupabaseAdminClient();

export type AdminUser = {
  id: string;
  displayName: string | null;
  role: string;
  createdAt: string;
  wallet: {
    balanceCents: number;
    status: string;
  } | null;
};

export const listUsersForAdmin = async (query?: string, limit = 20) => {
  const supabase = adminClient();
  let userQuery = supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .limit(limit)
    .order("created_at", { ascending: false });

  if (query) {
    userQuery = userQuery.ilike("display_name", `%${query}%`);
  }

  const { data, error } = await userQuery;
  if (error) {
    throw error;
  }

  const users = data ?? [];
  const userIds = users.map((user) => user.id);

  let walletMap = new Map<string, { balance_cents: number; status: string }>();
  if (userIds.length > 0) {
    const { data: wallets } = await supabase
      .from("wallets")
      .select("user_id, balance_cents, status")
      .in("user_id", userIds);
    walletMap = new Map((wallets ?? []).map((wallet) => [wallet.user_id, wallet]));
  }

  return users.map((user) => ({
    id: user.id,
    displayName: user.display_name,
    role: user.role,
    createdAt: user.created_at,
    wallet: walletMap.has(user.id)
      ? {
          balanceCents: walletMap.get(user.id)!.balance_cents,
          status: walletMap.get(user.id)!.status
        }
      : null
  }));
};

export const updateUserRole = async (userId: string, role: string) => {
  const supabase = adminClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) {
    throw error;
  }
};

export const adjustWalletBalance = async (userId: string, amountCents: number, direction: "credit" | "debit", reason?: string) => {
  if (amountCents <= 0) {
    throw new Error("Amount must be positive");
  }

  await getOrCreateWallet(userId);
  const metadata: Json = reason ? { reason } : {};
  if (direction === "credit") {
    await topUpWallet(userId, amountCents, metadata);
  } else {
    await consumeWallet(userId, amountCents, metadata);
  }
};

export const updateWalletStatus = async (userId: string, status: Database["public"]["Enums"]["wallet_status"]) => {
  const supabase = adminClient();
  const wallet = await getOrCreateWallet(userId);
  const { error } = await supabase.from("wallets").update({ status }).eq("id", wallet.id);
  if (error) {
    throw error;
  }
};

export const listRecentNotifications = async (limit = 20) => {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
        id,
        user_id,
        channel,
        type,
        title,
        body,
        created_at,
        sent_at,
        deliveries:notification_deliveries!notification_deliveries_notification_id_fkey(channel, status, external_reference)
      `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const listMichelleKnowledge = async () => {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("michelle_knowledge_parents")
    .select(
      `
        id,
        content,
        source,
        metadata,
        created_at,
        children:michelle_knowledge_children(id)
      `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data?.map((item) => ({
    ...item,
    child_count: item.children?.length ?? 0
  }));
};

export const deleteMichelleKnowledgeParent = async (parentId: string) => {
  const supabase = adminClient();
  const { error } = await supabase.from("michelle_knowledge_parents").delete().eq("id", parentId);
  if (error) {
    throw error;
  }
};

export const listCoursesForAdmin = async () => {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("learning_courses")
    .select(
      `
        id,
        slug,
        title,
        price,
        currency,
        published,
        total_duration_seconds,
        metadata,
        modules:learning_course_modules!learning_course_modules_course_id_fkey(
          id,
          title,
          order_index,
          lessons:learning_lessons!learning_lessons_module_id_fkey(id, title, slug)
        )
      `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const updateCoursePublished = async (courseId: string, published: boolean) => {
  const supabase = adminClient();
  const { error } = await supabase.from("learning_courses").update({ published }).eq("id", courseId);
  if (error) {
    throw error;
  }
};

export const listCounselorsForAdmin = async () => {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("counselors")
    .select(
      `
        id,
        display_name,
        slug,
        is_active,
        specialties,
        created_at,
        bookings:counselor_bookings(id)
      `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data?.map((item) => ({
    ...item,
    booking_count: item.bookings?.length ?? 0
  }));
};

export const updateCounselorActive = async (counselorId: string, isActive: boolean) => {
  const supabase = adminClient();
  const { error } = await supabase.from("counselors").update({ is_active: isActive }).eq("id", counselorId);
  if (error) {
    throw error;
  }
};

export const updateCounselorProfile = async (
  counselorId: string,
  updates: {
    display_name?: string;
    slug?: string;
    avatar_url?: string | null;
    bio?: string | null;
    specialties?: string[] | null;
    hourly_rate_cents?: number;
    intro_video_url?: string | null;
  }
) => {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("counselors")
    .update(updates)
    .eq("id", counselorId)
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  
  return data;
};

export const createCounselor = async (
  authUserId: string,
  profile: {
    slug: string;
    display_name: string;
    avatar_url?: string | null;
    bio?: string | null;
    specialties?: string[] | null;
    hourly_rate_cents?: number;
    intro_video_url?: string | null;
  }
) => {
  const supabase = adminClient();
  
  // First, ensure the user has counselor role
  await updateUserRole(authUserId, "counselor");
  
  // Then create the counselor profile
  const { data, error } = await supabase
    .from("counselors")
    .insert({
      auth_user_id: authUserId,
      slug: profile.slug,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url ?? null,
      bio: profile.bio ?? null,
      specialties: profile.specialties ?? [],
      hourly_rate_cents: profile.hourly_rate_cents ?? 12000,
      intro_video_url: profile.intro_video_url ?? null,
    })
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  
  return data;
};

export const listAuditLogs = async (limit = 50) => {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const getSystemHealth = async () => {
  const supabase = adminClient();
  const supabaseStatus = await supabase
    .from("profiles")
    .select("id", { head: true, count: "exact" })
    .limit(1)
    .then(() => true)
    .catch(() => false);

  return {
    supabase: supabaseStatus,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    featureFlags: {
      MICHELLE_AI_ENABLED: process.env.NEXT_PUBLIC_MICHELLE_AI_ENABLED ?? "false"
    }
  };
};
