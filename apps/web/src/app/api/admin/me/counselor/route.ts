import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getCounselorByAuthUser } from "@/server/services/counselors";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Get my counselor profile");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counselor = await getCounselorByAuthUser(user.id);
    return NextResponse.json({ counselor }); // Returns null if not a counselor
  } catch (error) {
    console.error("Failed to get counselor profile", error);
    return NextResponse.json({ error: "Failed to get counselor profile" }, { status: 500 });
  }
}
