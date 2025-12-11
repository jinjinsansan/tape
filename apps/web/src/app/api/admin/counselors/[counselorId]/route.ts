import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { updateCounselorProfile } from "@/server/services/admin";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

const paramsSchema = z.object({ counselorId: z.string().uuid() });
const bodySchema = z.object({
  display_name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  avatar_url: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  specialties: z.array(z.string()).nullable().optional(),
  hourly_rate_cents: z.number().int().min(0).optional(),
  intro_video_url: z.string().url().nullable().optional(),
});

export async function PATCH(request: Request, context: { params: { counselorId: string } }) {
  const { counselorId } = paramsSchema.parse(context.params);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin update counselor");
  if (response) return response;

  try {
    const counselor = await updateCounselorProfile(counselorId, parsed.data);
    return NextResponse.json({ counselor });
  } catch (error) {
    console.error("Failed to update counselor", error);
    return NextResponse.json({ error: "Failed to update counselor" }, { status: 500 });
  }
}
