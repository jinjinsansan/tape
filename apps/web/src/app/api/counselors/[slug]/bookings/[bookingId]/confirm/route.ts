import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { confirmBooking, SlotUnavailableError, CounselorNotFoundError } from "@/server/services/counselors";

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
  try {
    const user = await getRouteUser(supabase, "Counselor booking confirm");
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
    await confirmBooking(bookingId, userId);
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
