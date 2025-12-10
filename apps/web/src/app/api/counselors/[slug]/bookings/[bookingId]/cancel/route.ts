import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { cancelBooking, SlotUnavailableError } from "@/server/services/counselors";
import { sendBookingCancelledEmail } from "@/server/emails";

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
  let userName: string | undefined;

  try {
    const user = await getRouteUser(supabase, "Counselor booking cancel");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
    userEmail = user.email;
    // Try to get display name from metadata if possible, otherwise default
    userName = (user.user_metadata?.full_name as string) ?? "お客様";
  } catch (error) {
    const response = handleAuthError(error);
    if (response) return response;
    throw error;
  }

  try {
    const booking = await cancelBooking(bookingId, userId);

    if (userEmail && booking) {
      const startTime = booking.slot?.start_time 
        ? new Date(booking.slot.start_time).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
        : "日時不明";
      
      // @ts-ignore
      const counselorName = booking.counselor?.display_name ?? "担当カウンセラー";

      await sendBookingCancelledEmail(userEmail, userName, counselorName, startTime);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Failed to cancel booking", error);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}
