import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { getCounselorByAuthUser, listCounselorDashboardBookings } from "@/server/services/counselors";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let userId: string;
  try {
    const user = await getRouteUser(supabase, "Counselor dashboard");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
    }
    throw error;
  }

  try {
    const counselor = await getCounselorByAuthUser(userId);
    if (!counselor) {
      return NextResponse.json({ error: "Counselor profile not found" }, { status: 403 });
    }

    const bookings = await listCounselorDashboardBookings(counselor.id);
    return NextResponse.json({ bookings, counselor });
  } catch (error) {
    console.error("Failed to load counselor dashboard", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
