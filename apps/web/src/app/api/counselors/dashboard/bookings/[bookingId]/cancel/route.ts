import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { cancelBooking, getCounselorByAuthUser, SlotUnavailableError } from "@/server/services/counselors";
import { sendBookingCancelledEmail } from "@/server/emails";
import { getSupabaseAdminClient } from "@/server/supabase";

const paramsSchema = z.object({ bookingId: z.string().uuid() });

const handleAuthError = (error: unknown) => {
  if (error instanceof SupabaseAuthUnavailableError) {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
  return null;
};

export async function POST(_: Request, context: { params: { bookingId: string } }) {
  const { bookingId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let userId: string;

  try {
    const user = await getRouteUser(supabase, "Counselor booking cancel");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } catch (error) {
    const response = handleAuthError(error);
    if (response) return response;
    throw error;
  }

  try {
    const counselor = await getCounselorByAuthUser(userId);
    if (!counselor) {
      return NextResponse.json({ error: "Not a counselor" }, { status: 403 });
    }

    const booking = await cancelBooking(bookingId, userId, { allowCounselorActor: true });

    const adminClient = getSupabaseAdminClient();
    const { data: clientUser } = await adminClient.auth.admin.getUserById(booking.client_user_id);
    const clientEmail = clientUser?.user?.email ?? null;

    if (clientEmail) {
      const startTime = booking.slot?.start_time
        ? new Date(booking.slot.start_time).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
        : "日程未定";
      const counselorName = counselor.display_name ?? "担当カウンセラー";
      const clientName = booking.client?.display_name ?? "お客様";
      await sendBookingCancelledEmail(clientEmail, clientName, counselorName, startTime);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel booking as counselor", error);
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}
