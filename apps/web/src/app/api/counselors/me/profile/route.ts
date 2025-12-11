import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getCounselorByAuthUser } from "@/server/services/counselors";
import { updateCounselorProfile } from "@/server/services/admin";

const bodySchema = z.object({
  display_name: z.string().min(1).optional(),
  avatar_url: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  specialties: z.array(z.string()).nullable().optional(),
  hourly_rate_cents: z.number().int().min(0).optional(),
  intro_video_url: z.string().url().nullable().optional(),
});

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Get my counselor profile for editing");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counselor = await getCounselorByAuthUser(user.id);
    if (!counselor) {
      return NextResponse.json({ error: "Counselor profile not found" }, { status: 404 });
    }

    return NextResponse.json({ counselor });
  } catch (error) {
    console.error("Failed to get counselor profile", error);
    return NextResponse.json({ error: "Failed to get counselor profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Update my counselor profile");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counselor = await getCounselorByAuthUser(user.id);
    if (!counselor) {
      return NextResponse.json({ error: "Counselor profile not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error }, { status: 400 });
    }

    const updated = await updateCounselorProfile(counselor.id, parsed.data);
    return NextResponse.json({ counselor: updated });
  } catch (error) {
    console.error("Failed to update counselor profile", error);
    return NextResponse.json({ error: "Failed to update counselor profile" }, { status: 500 });
  }
}
