import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { adminCancelBooking } from "@/server/services/counselors";
import { sendBookingCancelledEmail } from "@/server/emails";
import { getSupabaseAdminClient } from "@/server/supabase";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function DELETE(_: Request, context: { params: { id: string } }) {
  const { id } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const adminSupabase = getSupabaseAdminClient();

  try {
    const { response } = await ensureAdmin(supabase, "Admin cancel booking");
    if (response) {
      return response;
    }

    const booking = await adminCancelBooking(id);

    // Send email if user email is available
    if (booking) {
      // Fetch user email by ID using admin client
      const { data: userData } = await adminSupabase.auth.admin.getUserById(booking.client_user_id);
      const email = userData.user?.email;
      
      if (email) {
          const startTime = booking.slot?.start_time 
          ? new Date(booking.slot.start_time).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
          : "日時不明";
          // @ts-ignore
          const counselorName = booking.counselor?.display_name ?? "担当カウンセラー";
          // @ts-ignore
          const userName = booking.client?.display_name ?? "お客様";

          await sendBookingCancelledEmail(email, userName, counselorName, startTime);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel booking", error);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}
