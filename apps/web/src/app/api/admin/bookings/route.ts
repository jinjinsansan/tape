import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getAdminBookingSummary, listAllBookings } from "@/server/services/counselors";
import type { BookingStatus } from "@tape/supabase";

const parseStatus = (value: string | null): BookingStatus | undefined => {
  if (!value || value === "all") return undefined;
  const valid: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled"];
  return valid.includes(value as BookingStatus) ? (value as BookingStatus) : undefined;
};

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const { response } = await ensureAdmin(supabase, "Admin list bookings");
    if (response) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const status = parseStatus(searchParams.get("status"));
    const paymentStatus = searchParams.get("paymentStatus") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(Number(limitParam) || 0, 1), 500) : undefined;

    const bookings = await listAllBookings({ status, paymentStatus, limit });
    const summary = await getAdminBookingSummary();

    return NextResponse.json({ bookings, summary });
  } catch (error) {
    console.error("Failed to list bookings", error);
    return NextResponse.json({ error: "Failed to list bookings" }, { status: 500 });
  }
}
