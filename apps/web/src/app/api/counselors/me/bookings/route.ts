import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getCounselorByAuthUser, listCounselorDashboardBookings } from "@/server/services/counselors";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Counselor dashboard bookings");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counselor = await getCounselorByAuthUser(user.id);
    if (!counselor) {
      return NextResponse.json({ error: "Not a counselor" }, { status: 403 });
    }

    const bookings = await listCounselorDashboardBookings(counselor.id);
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Failed to list dashboard bookings", error);
    return NextResponse.json({ error: "Failed to list bookings" }, { status: 500 });
  }
}
