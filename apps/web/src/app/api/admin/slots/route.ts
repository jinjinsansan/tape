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
    if (!user || (user.role !== "admin" && user.role !== "counselor")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { counselorId, startTime, endTime } = bodySchema.parse(body);

    if (user.role === "counselor") {
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
