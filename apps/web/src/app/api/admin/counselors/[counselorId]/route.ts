import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { updateCounselorProfile } from "@/server/services/admin";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import {
  DEFAULT_COUNSELOR_PLAN_SELECTION,
  mergePlanSelectionIntoMetadata
} from "@/constants/counselor-plans";
import { getSupabaseAdminClient } from "@/server/supabase";

const paramsSchema = z.object({ counselorId: z.string().uuid() });
const bodySchema = z.object({
  display_name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  avatar_url: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  specialties: z.array(z.string()).nullable().optional(),
  hourly_rate_cents: z.number().int().min(0).optional(),
  intro_video_url: z.string().url().nullable().optional(),
  plan_settings: z
    .object({
      single_session: z.boolean().optional(),
      monthly_course: z.boolean().optional()
    })
    .optional()
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
  const adminSupabase = getSupabaseAdminClient();

  try {
    const { plan_settings, ...rest } = parsed.data;
    const updates: Parameters<typeof updateCounselorProfile>[1] = { ...rest };

    if (plan_settings) {
      const { data: existing, error } = await adminSupabase
        .from("counselors")
        .select("profile_metadata")
        .eq("id", counselorId)
        .maybeSingle();

      if (error) {
        console.error("Failed to load counselor metadata", error);
        return NextResponse.json({ error: "カウンセラー情報の取得に失敗しました" }, { status: 500 });
      }

      if (!existing) {
        return NextResponse.json({ error: "Counselor not found" }, { status: 404 });
      }

      const normalized = {
        ...DEFAULT_COUNSELOR_PLAN_SELECTION,
        ...plan_settings
      };
      updates.profile_metadata = mergePlanSelectionIntoMetadata(existing.profile_metadata, normalized);
    }

    const counselor = await updateCounselorProfile(counselorId, updates);
    return NextResponse.json({ counselor });
  } catch (error) {
    console.error("Failed to update counselor", error);
    return NextResponse.json({ error: "Failed to update counselor" }, { status: 500 });
  }
}
