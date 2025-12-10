import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { confirmBooking, SlotUnavailableError, CounselorNotFoundError } from "@/server/services/counselors";
import { sendBookingCreatedEmail } from "@/server/emails";

const paramsSchema = z.object({ slug: z.string().min(1), bookingId: z.string().uuid() });

const handleAuthError = (error: unknown) => {
  if (error instanceof SupabaseAuthUnavailableError) {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
  return null;
};

export async function POST(_: Request, context: { params: { slug: string; bookingId: string } }) {
  const { bookingId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let userId: string;
  let userEmail: string | undefined;

  try {
    const user = await getRouteUser(supabase, "Counselor booking confirm");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
    userEmail = user.email;
  } catch (error) {
    const response = handleAuthError(error);
    if (response) return response;
    throw error;
  }

  try {
    const booking = await confirmBooking(bookingId, userId);
    
    if (userEmail && booking) {
      const startTime = booking.slot?.start_time 
        ? new Date(booking.slot.start_time).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
        : "日時不明";
        
      // @ts-ignore - Booking type inference might be tricky with joins
      const counselorName = booking.counselor?.display_name ?? "担当カウンセラー";
      // @ts-ignore
      const userName = booking.client?.display_name ?? "お客様";

      await sendBookingCreatedEmail(
        userEmail, 
        userName, 
        counselorName, 
        startTime,
        undefined // Zoom URL not yet supported in DB
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof CounselorNotFoundError) {
      return NextResponse.json({ error: "Counselor not found" }, { status: 404 });
    }
    console.error("Failed to confirm booking", error);
    return NextResponse.json({ error: "Failed to confirm booking" }, { status: 500 });
  }
}
