import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { listCounselorsForAdmin, createCounselor } from "@/server/services/admin";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

const createBodySchema = z.object({
  authUserId: z.string().uuid(),
  slug: z.string().min(1),
  display_name: z.string().min(1),
  avatar_url: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  specialties: z.array(z.string()).nullable().optional(),
  hourly_rate_cents: z.number().int().min(0).optional(),
  intro_video_url: z.string().url().nullable().optional(),
});

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin counselors");
  if (response) return response;

  try {
    const counselors = await listCounselorsForAdmin();
    return NextResponse.json({ counselors });
  } catch (error) {
    console.error("Failed to load counselors", error);
    return NextResponse.json({ error: "Failed to load counselors" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin create counselor");
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = createBodySchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error }, { status: 400 });
  }

  try {
    const counselor = await createCounselor(parsed.data.authUserId, {
      slug: parsed.data.slug,
      display_name: parsed.data.display_name,
      avatar_url: parsed.data.avatar_url,
      bio: parsed.data.bio,
      specialties: parsed.data.specialties,
      hourly_rate_cents: parsed.data.hourly_rate_cents,
      intro_video_url: parsed.data.intro_video_url,
    });
    return NextResponse.json({ counselor });
  } catch (error) {
    console.error("Failed to create counselor", error);
    return NextResponse.json({ error: "Failed to create counselor" }, { status: 500 });
  }
}
