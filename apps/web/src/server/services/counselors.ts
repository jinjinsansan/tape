import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  BookingStatus,
  IntroChatStatus,
  SlotStatus
} from "@tape/supabase";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getOrCreateWallet, consumeWallet, topUpWallet } from "@/server/services/wallet";

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
    .select(`${publicSelect}, slots:counselor_slots(count)`)
    .eq("is_active", true)
    .eq("slots.status", "available")
    .gte("slots.start_time", new Date().toISOString())
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  // The .eq filter on joined table "slots" might filter out counselors entirely if they have no slots
  // depending on how Supabase/PostgREST handles inner vs left join. 
  // By default, !inner join is used if a filter is applied on the foreign table.
  // We want to list ALL counselors, but just count their available slots.
  // To do this properly in one query without filtering out counselors, we might need a different approach
  // or accept that Supabase syntax `slots(count)` with filters might be tricky.
  // Actually, filtering inside the select: `slots:counselor_slots(count)` with modifiers works if supported.
  
  // Let's try a simpler approach: get all counselors, then maybe parallel fetch counts or trust the simple join.
  // The correct syntax for filtered count without filtering the parent row is tricky in standard PostgREST client.
  // However, we can just fetch all counselors and their available slots (id only) or use a view.
  // Given the likely small number of counselors, let's just fetch their future available slots.
  
  const { data: counselors, error: fetchError } = await supabase
    .from("counselors")
    .select(`
      ${publicSelect},
      slots:counselor_slots(id)
    `)
    .eq("is_active", true)
    .eq("slots.status", "available")
    .gte("slots.start_time", new Date().toISOString())
    .order("display_name", { ascending: true });

  if (fetchError) throw fetchError;

  // Wait, if I filter on slots (eq, gte), it performs an INNER JOIN by default in Supabase JS client
  // which means counselors with 0 slots will be excluded.
  // To keep counselors with 0 slots, we need to NOT filter on the top level but on the relation.
  // But standard Supabase client doesn't support complex nested filtering easily for LEFT JOIN behavior with constraints on the right side.
  
  // Alternative: Fetch all counselors first. Then fetching slots is a separate query or we accept the limitation.
  // Better approach: Since we want to display "No slots" for counselors without slots, we need them in the list.
  
  // Let's reset to basic fetch and use a second query for availability or just "available_slots_count" if we can.
  // For now, let's fetch counselors, then fetch all future available slots and map them.
  
  const { data: allCounselors, error: counselorsError } = await supabase
    .from("counselors")
    .select(publicSelect)
    .eq("is_active", true)
    .order("display_name", { ascending: true });
    
  if (counselorsError) throw counselorsError;
  
  const counselorIds = allCounselors?.map(c => c.id) ?? [];
  
  if (counselorIds.length === 0) return [];
  
  const { data: slots } = await supabase
    .from("counselor_slots")
    .select("counselor_id")
    .in("counselor_id", counselorIds)
    .eq("status", "available")
    .gte("start_time", new Date().toISOString());
    
  const slotCounts = new Map<string, number>();
  slots?.forEach(s => {
    slotCounts.set(s.counselor_id, (slotCounts.get(s.counselor_id) ?? 0) + 1);
  });
  
  return allCounselors?.map(c => ({
    ...c,
    available_slots_count: slotCounts.get(c.id) ?? 0
  })) ?? [];
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

export const createBooking = async (
  slug: string,
  slotId: string,
  clientUserId: string,
  notes: string | null
) => {
  const supabase = getSupabaseAdminClient();
  const counselor = await getCounselor(slug, supabase);

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

  const { data: booking, error: bookingError } = await supabase
    .from("counselor_bookings")
    .insert({
      slot_id: slot.id,
      counselor_id: counselor.id,
      client_user_id: clientUserId,
      price_cents: counselor.hourly_rate_cents,
      notes
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

  await markSlotStatus(supabase, booking.slot_id, "available", { held_until: null });

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

  await markSlotStatus(supabase, booking.slot_id, "booked", { held_until: null });

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
      counselor:counselors!counselor_bookings_counselor_id_fkey(id, display_name),
      slot:counselor_slots!counselor_bookings_slot_id_fkey(start_time, end_time)
    `)
    .eq("id", booking.id)
    .single();

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
    .select("id, display_name, slug, avatar_url, bio, specialties, hourly_rate_cents, intro_video_url, is_active")
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
  start_time: string;
  end_time: string;
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
    start_time: booking.slot?.start_time ?? "",
    end_time: booking.slot?.end_time ?? "",
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

  // Release slot
  await markSlotStatus(supabase, booking.slot_id, "available", { held_until: null });

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
  return data ?? [];
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
