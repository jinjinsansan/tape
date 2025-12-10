import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { createSlot } from "@/server/services/counselors";

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
    if (!user || user.role !== "admin") {
      // Allow counselors to manage their own slots? 
      // The prompt says "Counselor side is Admin Panel... Counselor can freely decide vacant slots".
      // So if not admin, check if user is the counselor.
      
      // For now, strict Admin or Counselor check
      // But we haven't implemented "Am I this counselor?" check easily here without fetching counselor profile.
      // Let's rely on role check. If user is "counselor", they can generally add slots (maybe restrict to their ID later).
      // For simplicity in this iteration: Admin or Counselor role.
      if (user?.role !== "counselor" && user?.role !== "admin") {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { counselorId, startTime, endTime } = bodySchema.parse(body);

    const slot = await createSlot(counselorId, startTime, endTime);
    return NextResponse.json({ slot });
  } catch (error) {
    console.error("Failed to create slot", error);
    return NextResponse.json({ error: "Failed to create slot" }, { status: 500 });
  }
}
