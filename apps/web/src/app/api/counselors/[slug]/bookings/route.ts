import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { createBooking, CounselorNotFoundError, SlotUnavailableError, confirmBooking } from "@/server/services/counselors";

const paramsSchema = z.object({ slug: z.string().min(1) });
const bodySchema = z.object({
  planType: z.enum(["single_session", "monthly_course"]),
  notes: z.string().max(1000).optional().nullable(),
  slotId: z.string().uuid().optional().nullable(),
  payNow: z.boolean().optional()
});

const handleAuthError = (error: unknown) => {
  if (error instanceof SupabaseAuthUnavailableError) {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
  return null;
};

export async function POST(request: Request, context: { params: { slug: string } }) {
  const { slug } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let userId: string;
  try {
    const user = await getRouteUser(supabase, `Counselor booking: ${slug}`);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } catch (error) {
    const response = handleAuthError(error);
    if (response) return response;
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking payload" }, { status: 400 });
  }

  try {
    const result = await createBooking({
      slug,
      clientUserId: userId,
      planType: parsed.data.planType,
      notes: parsed.data.notes ?? null,
      slotId: parsed.data.slotId ?? null
    });

    let bookingResponse = result.booking;

    if (parsed.data.payNow) {
      bookingResponse = await confirmBooking(result.booking.id, userId);
    }

    return NextResponse.json({ booking: bookingResponse, chatId: result.chatId });
  } catch (error) {
    if (error instanceof CounselorNotFoundError) {
      return NextResponse.json({ error: "Counselor not found" }, { status: 404 });
    }
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Failed to create booking", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
