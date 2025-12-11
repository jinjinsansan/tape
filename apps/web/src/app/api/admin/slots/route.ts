import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { createSlot, getCounselorByAuthUser } from "@/server/services/counselors";

const bodySchema = z.object({
  counselorId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime()
});

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Admin create slot");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Failed to load profile", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 500 });
    }

    if (profile.role !== "admin" && profile.role !== "counselor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { counselorId, startTime, endTime } = bodySchema.parse(body);

    if (profile.role === "counselor") {
      const myCounselor = await getCounselorByAuthUser(user.id);
      if (!myCounselor || myCounselor.id !== counselorId) {
        return NextResponse.json({ error: "Unauthorized access to counselor profile" }, { status: 403 });
      }
    }

    const slot = await createSlot(counselorId, startTime, endTime);
    return NextResponse.json({ slot });
  } catch (error) {
    console.error("Failed to create slot", error);
    return NextResponse.json({ error: "Failed to create slot" }, { status: 500 });
  }
}
