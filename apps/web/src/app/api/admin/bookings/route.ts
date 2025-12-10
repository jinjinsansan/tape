import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { listAllBookings } from "@/server/services/counselors";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Admin list bookings");
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookings = await listAllBookings();
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Failed to list bookings", error);
    return NextResponse.json({ error: "Failed to list bookings" }, { status: 500 });
  }
}
