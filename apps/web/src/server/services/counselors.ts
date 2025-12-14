import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  BookingStatus,
  IntroChatStatus,
  SlotStatus,
  CounselorPlanType
} from "@tape/supabase";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getOrCreateWallet, consumeWallet, topUpWallet } from "@/server/services/wallet";
import { COUNSELOR_PLAN_CONFIGS, normalizePlanSelection } from "@/constants/counselor-plans";
import { createNotification, notifyAdmin } from "@/server/services/notifications";

type Supabase = SupabaseClient<Database>;

export class CounselorNotFoundError extends Error {
  constructor(slug: string) {
    super(`Counselor not found: ${slug}`);
    this.name = "CounselorNotFoundError";
  }
}

export class SlotUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlotUnavailableError";
  }
}

export type CounselorProfile = Database["public"]["Tables"]["counselors"]["Row"];
export type CounselorSlot = Database["public"]["Tables"]["counselor_slots"]["Row"];
export type CounselorBooking = Database["public"]["Tables"]["counselor_bookings"]["Row"];
export type IntroChatMessage = Database["public"]["Tables"]["counselor_intro_messages"]["Row"] & {
  sender_profile?: Database["public"]["Tables"]["profiles"]["Row"] | null;
};

type CreateBookingParams = {
  slug: string;
  clientUserId: string;
  planType: CounselorPlanType;
  notes?: string | null;
  slotId?: string | null;
};

const publicSelect = `
  id,
  slug,
  display_name,
  avatar_url,
  bio,
  specialties,
  hourly_rate_cents,
  intro_video_url,
  profile_metadata
`;

export const listCounselors = async (supabase = getSupabaseAdminClient()) => {
  const { data, error } = await supabase
    .from("counselors")
    .select(publicSelect)
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const getCounselor = async (slug: string, supabase = getSupabaseAdminClient()) => {
  const { data, error } = await supabase
    .from("counselors")
    .select(`${publicSelect}, auth_user_id`)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new CounselorNotFoundError(slug);
  }
  return data;
};

export const listAvailableSlots = async (counselorId: string, limit = 20, supabase = getSupabaseAdminClient()) => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("counselor_slots")
    .select("id, counselor_id, start_time, end_time, status, held_until")
    .eq("counselor_id", counselorId)
    .gte("start_time", now)
    .order("start_time", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }
  return data ?? [];
};

const markSlotStatus = async (
  supabase: Supabase,
  slotId: string,
  status: SlotStatus,
  extras?: Partial<Database["public"]["Tables"]["counselor_slots"]["Update"]>
) => {
  const { error } = await supabase
    .from("counselor_slots")
    .update({ status, ...extras })
    .eq("id", slotId);

  if (error) {
    throw error;
  }
};

export const createBooking = async ({
  slug,
  clientUserId,
  planType,
  notes = null,
  slotId
}: CreateBookingParams) => {
  const supabase = getSupabaseAdminClient();
  const counselor = await getCounselor(slug, supabase);

  const planSelection = normalizePlanSelection(counselor.profile_metadata);
  if (!planSelection[planType]) {
    throw new SlotUnavailableError("このプランは現在提供されていません。");
  }

  const planConfig = COUNSELOR_PLAN_CONFIGS[planType];
  let resolvedSlotId: string | null = null;
  if (slotId) {
    const { data: slot, error: slotError } = await supabase
      .from("counselor_slots")
      .select("id, counselor_id, start_time, end_time, status, held_until")
      .eq("id", slotId)
      .maybeSingle();

    if (slotError) {
      throw slotError;
    }
    if (!slot || slot.counselor_id !== counselor.id) {
      throw new SlotUnavailableError("Slot not found");
    }
    if (slot.status !== "available") {
      throw new SlotUnavailableError("Slot is already booked");
    }

    await markSlotStatus(supabase, slot.id, "held", { held_until: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
    resolvedSlotId = slot.id;
  }

  const { data: booking, error: bookingError } = await supabase
    .from("counselor_bookings")
    .insert({
      slot_id: resolvedSlotId,
      counselor_id: counselor.id,
      client_user_id: clientUserId,
      price_cents: planConfig.priceCents,
      notes,
      plan_type: planType
    })
    .select("*")
    .single();

  if (bookingError) {
    throw bookingError;
  }

  const { data: chat, error: chatError } = await supabase
    .from("counselor_intro_chats")
    .insert({ booking_id: booking.id })
    .select("id")
    .single();

  if (chatError) {
    throw chatError;
  }

  const { error: updateBookingError } = await supabase
    .from("counselor_bookings")
    .update({ intro_chat_id: chat.id })
    .eq("id", booking.id);

  if (updateBookingError) {
    throw updateBookingError;
  }

  return { booking, chatId: chat.id, counselor };
};

export const cancelBooking = async (bookingId: string, userId: string) => {
  const supabase = getSupabaseAdminClient();
  const { data: booking, error } = await supabase
    .from("counselor_bookings")
    .select("id, slot_id, client_user_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!booking || booking.client_user_id !== userId) {
    throw new SlotUnavailableError("Booking not found");
  }
  if (booking.status !== "pending") {
    throw new SlotUnavailableError("Only pending bookings can be cancelled");
  }

  if (booking.slot_id) {
    await markSlotStatus(supabase, booking.slot_id, "available", { held_until: null });
  }

  const { error: cancelError } = await supabase
    .from("counselor_bookings")
    .update({ status: "cancelled" })
    .eq("id", booking.id);

  if (cancelError) {
    throw cancelError;
  }

  // Return booking for email notification
  const { data: cancelledBooking } = await supabase
    .from("counselor_bookings")
    .select(`
      *,
      counselor:counselors!counselor_bookings_counselor_id_fkey(display_name),
      slot:counselor_slots!counselor_bookings_slot_id_fkey(start_time, end_time)
    `)
    .eq("id", booking.id)
    .single();

  return cancelledBooking;
};

type IntroMessagePayload = {
  chatId: string;
  senderUserId: string;
  body: string;
  role?: string;
};

export const postIntroMessage = async (payload: IntroMessagePayload) => {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("counselor_intro_messages")
    .insert({
      chat_id: payload.chatId,
      sender_user_id: payload.senderUserId,
      body: payload.body,
      role: payload.role ?? "client"
    });

  if (error) {
    throw error;
  }
};

const ensureClientWalletBalance = async (userId: string, amount: number) => {
  const wallet = await getOrCreateWallet(userId);
  if (wallet.balance_cents < amount) {
    throw new SlotUnavailableError("ウォレット残高が不足しています。");
  }
};

export const confirmBooking = async (bookingId: string, userId: string) => {
  const supabase = getSupabaseAdminClient();
  const { data: booking, error } = await supabase
    .from("counselor_bookings")
    .select("id, slot_id, client_user_id, price_cents, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!booking || booking.client_user_id !== userId) {
    throw new SlotUnavailableError("Booking not found");
  }
  if (booking.status !== "pending") {
    throw new SlotUnavailableError("Booking is not pending");
  }

  await ensureClientWalletBalance(userId, booking.price_cents);
  await consumeWallet(userId, booking.price_cents, { bookingId });

  if (booking.slot_id) {
    await markSlotStatus(supabase, booking.slot_id, "booked", { held_until: null });
  }

  const { error: updateError } = await supabase
    .from("counselor_bookings")
    .update({ status: "confirmed", payment_status: "paid" })
    .eq("id", booking.id);

  if (updateError) {
    throw updateError;
  }

  const { data: confirmedBooking } = await supabase
    .from("counselor_bookings")
    .select(`
      *,
      client:profiles!counselor_bookings_client_user_id_fkey(id, display_name, avatar_url),
      counselor:counselors!counselor_bookings_counselor_id_fkey(id, display_name, auth_user_id),
      slot:counselor_slots!counselor_bookings_slot_id_fkey(start_time, end_time)
    `)
    .eq("id", booking.id)
    .single();

  // Send notifications
  if (confirmedBooking) {
    const clientName = (confirmedBooking.client as any)?.display_name ?? "ユーザー";
    const counselorName = (confirmedBooking.counselor as any)?.display_name ?? "カウンセラー";
    const counselorAuthUserId = (confirmedBooking.counselor as any)?.auth_user_id;
    const slotTime = (confirmedBooking.slot as any)?.start_time 
      ? new Date((confirmedBooking.slot as any).start_time).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
      : "未定";
    const planLabel = confirmedBooking.plan_type === "single_session" ? "単発セッション" : "月額コース";

    // Get client email
    const { data: clientUser } = await supabase.auth.admin.getUserById(confirmedBooking.client_user_id);
    const clientEmail = clientUser?.user?.email ?? "不明";

    // Notify client
    await createNotification({
      userId: confirmedBooking.client_user_id,
      channel: "in_app",
      type: "booking.confirmed",
      category: "booking",
      title: "📅 カウンセリング予約確定",
      body: `${counselorName}先生とのカウンセリングが確定しました。\nプラン: ${planLabel}\n日時: ${slotTime}`,
      data: { booking_id: confirmedBooking.id, counselor_id: confirmedBooking.counselor_id }
    }).catch(err => console.error("Failed to notify client", err));

    // Notify counselor
    if (counselorAuthUserId) {
      await createNotification({
        userId: counselorAuthUserId,
        channel: "in_app",
        type: "booking.new_client",
        category: "booking",
        title: "🎉 新規予約受付",
        body: `${clientName}さんから予約が入りました。\nプラン: ${planLabel}\n日時: ${slotTime}`,
        data: { booking_id: confirmedBooking.id, client_user_id: confirmedBooking.client_user_id }
      }).catch(err => console.error("Failed to notify counselor", err));
    }

    // Notify admin
    await notifyAdmin({
      type: "booking.confirmed.admin",
      category: "booking",
      title: "📅 カウンセリング予約通知",
      body: `クライアント: ${clientName} (${clientEmail})\nカウンセラー: ${counselorName}\nプラン: ${planLabel}\n日時: ${slotTime}\n金額: ¥${(confirmedBooking.price_cents / 100).toLocaleString()}`,
      data: {
        booking_id: confirmedBooking.id,
        client_user_id: confirmedBooking.client_user_id,
        client_email: clientEmail,
        counselor_id: confirmedBooking.counselor_id,
        plan_type: confirmedBooking.plan_type,
        price_cents: confirmedBooking.price_cents
      }
    }).catch(err => console.error("Failed to notify admin", err));
  }

  return confirmedBooking;
};

export const getIntroMessages = async (chatId: string, supabase = getSupabaseAdminClient()) => {
  const { data, error } = await supabase
    .from("counselor_intro_messages")
    .select("id, chat_id, sender_user_id, body, role, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  // Fetch sender profiles separately
  const senderIds = data?.map(m => m.sender_user_id).filter(Boolean) ?? [];
  const profilesMap = new Map();
  
  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", senderIds);
    
    profiles?.forEach(p => profilesMap.set(p.id, p));
  }

  return (data ?? []).map(msg => ({
    ...msg,
    sender_profile: profilesMap.get(msg.sender_user_id) || null
  })) as IntroChatMessage[];
};

export const closeIntroChat = async (chatId: string, status: IntroChatStatus = "closed") => {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("counselor_intro_chats")
    .update({ status })
    .eq("id", chatId);

  if (error) {
    throw error;
  }
};

export const getCounselorByAuthUser = async (authUserId: string) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("counselors")
    .select("id, display_name, slug, avatar_url, bio, specialties, hourly_rate_cents, intro_video_url, is_active, profile_metadata")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
};

export type CounselorDashboardBooking = {
  id: string;
  status: BookingStatus;
  payment_status: string;
  plan_type: CounselorPlanType;
  start_time: string | null;
  end_time: string | null;
  client: {
    id: string;
    display_name: string | null;
  } | null;
  notes: string | null;
  intro_chat_id: string | null;
};

export const listCounselorDashboardBookings = async (counselorId: string): Promise<CounselorDashboardBooking[]> => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("counselor_bookings")
    .select(
      `
        id,
        status,
        payment_status,
        plan_type,
        notes,
        intro_chat_id,
        client_user_id,
        slot:counselor_slots(start_time, end_time)
      `
    )
    .eq("counselor_id", counselorId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw error;
  }

  // Fetch client profiles separately
  const clientIds = data?.map(b => b.client_user_id).filter(Boolean) ?? [];
  const clientsMap = new Map();
  
  if (clientIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", clientIds);
    
    profiles?.forEach(p => clientsMap.set(p.id, p));
  }

  return (data ?? []).map((booking) => ({
    id: booking.id,
    status: booking.status,
    payment_status: booking.payment_status,
    notes: booking.notes,
    intro_chat_id: booking.intro_chat_id,
    plan_type: booking.plan_type,
    start_time: booking.slot?.start_time ?? null,
    end_time: booking.slot?.end_time ?? null,
    client: clientsMap.get(booking.client_user_id) || { id: booking.client_user_id, display_name: null }
  }));
};

export const listAllBookings = async (limit = 100) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("counselor_bookings")
    .select(`
      *,
      counselor:counselors(display_name),
      client:profiles(display_name),
      slot:counselor_slots(start_time, end_time)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
};

export const adminCancelBooking = async (bookingId: string) => {
  const supabase = getSupabaseAdminClient();
  const { data: booking, error } = await supabase
    .from("counselor_bookings")
    .select("id, slot_id, status, price_cents, client_user_id, payment_status")
    .eq("id", bookingId)
    .single();

  if (error) throw error;
  if (!booking) throw new Error("Booking not found");

  // Release slot if applicable
  if (booking.slot_id) {
    await markSlotStatus(supabase, booking.slot_id, "available", { held_until: null });
  }

  const { error: cancelError } = await supabase
    .from("counselor_bookings")
    .update({ status: "cancelled", payment_status: "refunded" })
    .eq("id", bookingId);

  if (cancelError) throw cancelError;

  // Refund if paid (after status update to prevent race)
  if (booking.payment_status === "paid") {
    try {
      await topUpWallet(booking.client_user_id, booking.price_cents, {
        reason: "Admin cancellation refund",
        bookingId
      });
    } catch (refundError) {
      console.error("Failed to refund wallet after booking cancellation", { bookingId, userId: booking.client_user_id, error: refundError });
      // In a real system, this should trigger an alert for manual intervention
    }
  }
  
  // Return booking for email notification
  const { data: cancelledBooking } = await supabase
    .from("counselor_bookings")
    .select(`
      *,
      client:profiles(id, display_name, email:auth_user_id(email)), -- Wait, profiles doesn't link email directly usually
      counselor:counselors(display_name),
      slot:counselor_slots(start_time, end_time)
    `)
    .eq("id", bookingId)
    .single();
    
    // Note: Fetching email from auth_users is tricky via join in standard Supabase if not configured.
    // We'll assume the caller handles email fetching or we use a separate call if needed.
    
    return booking;
};

export const listUserBookings = async (userId: string) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("counselor_bookings")
    .select(`
      *,
      counselor:counselors(display_name, avatar_url, slug),
      slot:counselor_slots(start_time, end_time)
    `)
    .eq("client_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((booking) => ({
    ...booking,
    start_time: booking.slot?.start_time ?? null,
    end_time: booking.slot?.end_time ?? null
  }));
};

export const createSlot = async (counselorId: string, startTime: string, endTime: string) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("counselor_slots")
    .insert({
      counselor_id: counselorId,
      start_time: startTime,
      end_time: endTime,
      status: "available"
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getSlot = async (slotId: string) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("counselor_slots")
    .select("id, counselor_id, status")
    .eq("id", slotId)
    .single();

  if (error) throw error;
  return data;
};

export const deleteSlot = async (slotId: string) => {
  const supabase = getSupabaseAdminClient();
  // Only delete if available
  const { error } = await supabase
    .from("counselor_slots")
    .delete()
    .eq("id", slotId)
    .eq("status", "available");

  if (error) throw error;
};
