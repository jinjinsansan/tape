import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { confirmBooking, SlotUnavailableError, CounselorNotFoundError } from "@/server/services/counselors";
import { sendBookingCreatedEmail, sendBookingCounselorNotificationEmail, sendBookingAdminAlertEmail } from "@/server/emails";
import { createNotification } from "@/server/services/notifications";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getAdminNotificationEmail, getAdminNotificationUserId } from "@/lib/env";
import { COUNSELOR_PLAN_CONFIGS } from "@/constants/counselor-plans";

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
    const planTitle = booking?.plan_type ? COUNSELOR_PLAN_CONFIGS[booking.plan_type]?.title : undefined;
    const startTimeJst = booking?.slot?.start_time
      ? new Date(booking.slot.start_time).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
      : "日時未定";
    const counselorName = booking?.counselor?.display_name ?? "担当カウンセラー";
    const clientName = booking?.client?.display_name ?? "お客様";
    
    if (booking) {
      if (userEmail) {
        await sendBookingCreatedEmail(
          userEmail,
          clientName,
          counselorName,
          startTimeJst,
          undefined
        );
      }

      await createNotification({
        userId,
        channel: "in_app",
        type: "booking.confirmed.client",
        title: "カウンセリング予約が確定しました",
        body: `${startTimeJst} / ${counselorName}${planTitle ? `\nプラン: ${planTitle}` : ""}`
      });

      const adminClient = getSupabaseAdminClient();
      const counselorUserId = booking.counselor?.auth_user_id ?? null;
      let counselorEmail: string | null = null;
      if (counselorUserId) {
        await createNotification({
          userId: counselorUserId,
          channel: "in_app",
          type: "booking.confirmed.counselor",
          title: "新しい予約が確定しました",
          body: `${startTimeJst} / ${clientName}${planTitle ? `\nプラン: ${planTitle}` : ""}`
        });

        const { data: counselorUser } = await adminClient.auth.admin.getUserById(counselorUserId);
        counselorEmail = counselorUser.user?.email ?? null;
      }

      if (counselorEmail) {
        await sendBookingCounselorNotificationEmail(
          counselorEmail,
          counselorName,
          clientName,
          startTimeJst,
          planTitle
        );
      }

      const adminEmail = getAdminNotificationEmail();
      const adminUserId = getAdminNotificationUserId();

      if (adminUserId) {
        await createNotification({
          userId: adminUserId,
          channel: "in_app",
          type: "booking.confirmed.admin",
          title: "新しい予約が確定しました",
          body: `${clientName} → ${counselorName}\n${startTimeJst}${planTitle ? `\nプラン: ${planTitle}` : ""}`
        }).catch((err) => console.error("Failed to notify admin", err));
      }

      if (adminEmail) {
        await sendBookingAdminAlertEmail(
          adminEmail,
          counselorName,
          clientName,
          startTimeJst,
          planTitle
        );
      }
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
