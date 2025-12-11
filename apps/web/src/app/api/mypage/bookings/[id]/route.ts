import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Get booking detail");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = getSupabaseAdminClient();

    // Get booking with counselor info
    const { data: booking, error: bookingError } = await adminSupabase
      .from("counselor_bookings")
      .select("id, status, payment_status, price_cents, notes, created_at, intro_chat_id, slot_id, counselor_id")
      .eq("id", params.id)
      .eq("client_user_id", user.id)
      .maybeSingle();

    if (bookingError) {
      throw bookingError;
    }

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get slot info
    const { data: slot, error: slotError } = await adminSupabase
      .from("counselor_slots")
      .select("start_time, end_time")
      .eq("id", booking.slot_id)
      .maybeSingle();

    if (slotError) {
      throw slotError;
    }

    // Get counselor info
    const { data: counselor, error: counselorError } = await adminSupabase
      .from("counselors")
      .select("id, user_id")
      .eq("id", booking.counselor_id)
      .maybeSingle();

    if (counselorError) {
      throw counselorError;
    }

    // Get counselor profile
    const { data: counselorProfile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", counselor?.user_id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json({
      booking: {
        ...booking,
        start_time: slot?.start_time,
        end_time: slot?.end_time,
        counselor: {
          display_name: counselorProfile?.display_name ?? "カウンセラー",
          avatar_url: counselorProfile?.avatar_url,
        },
      },
    });
  } catch (error) {
    console.error("Failed to get booking", error);
    return NextResponse.json({ error: "Failed to get booking" }, { status: 500 });
  }
}
