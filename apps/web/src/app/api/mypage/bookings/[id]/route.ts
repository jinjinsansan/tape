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

    // Get booking with counselor and slot info using joins
    const { data: booking, error: bookingError } = await adminSupabase
      .from("counselor_bookings")
      .select(`
        id,
        status,
        payment_status,
        price_cents,
        plan_type,
        notes,
        created_at,
        intro_chat_id,
        counselor:counselors(display_name, avatar_url, slug),
        slot:counselor_slots(start_time, end_time)
      `)
      .eq("id", params.id)
      .eq("client_user_id", user.id)
      .maybeSingle();

    if (bookingError) {
      console.error("Booking query error:", bookingError);
      throw bookingError;
    }

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        status: booking.status,
        payment_status: booking.payment_status,
        price_cents: booking.price_cents,
        plan_type: booking.plan_type,
        notes: booking.notes,
        created_at: booking.created_at,
        intro_chat_id: booking.intro_chat_id,
        start_time: booking.slot?.start_time,
        end_time: booking.slot?.end_time,
        counselor: {
          display_name: booking.counselor?.display_name ?? "カウンセラー",
          avatar_url: booking.counselor?.avatar_url,
          slug: booking.counselor?.slug ?? "",
        },
      },
    });
  } catch (error) {
    console.error("Failed to get booking", error);
    return NextResponse.json({ error: "Failed to get booking" }, { status: 500 });
  }
}
