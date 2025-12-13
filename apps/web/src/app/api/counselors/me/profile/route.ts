import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getCounselorByAuthUser } from "@/server/services/counselors";
import { updateCounselorProfile } from "@/server/services/admin";
import {
  DEFAULT_COUNSELOR_PLAN_SELECTION,
  mergePlanSelectionIntoMetadata
} from "@/constants/counselor-plans";
import { normalizeYouTubeEmbedUrl } from "@/lib/youtube";
import { mergeCounselorSocialLinks } from "@/lib/counselor-metadata";

const bodySchema = z.object({
  display_name: z.string().min(1).optional(),
  avatar_url: z.string().url().max(2048).nullable().optional(),
  bio: z.string().nullable().optional(),
  specialties: z.array(z.string()).nullable().optional(),
  hourly_rate_cents: z.number().int().min(0).optional(),
  intro_video_url: z.string().url().nullable().optional(),
  line_url: z.string().url().nullable().optional(),
  x_url: z.string().url().nullable().optional(),
  instagram_url: z.string().url().nullable().optional(),
  plan_settings: z
    .object({
      single_session: z.boolean().optional(),
      monthly_course: z.boolean().optional()
    })
    .optional()
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

    const { plan_settings, intro_video_url, line_url, x_url, instagram_url, ...rest } = parsed.data;
    const updates: Parameters<typeof updateCounselorProfile>[1] = { ...rest };

    if (intro_video_url !== undefined) {
      updates.intro_video_url = normalizeYouTubeEmbedUrl(intro_video_url) ?? null;
    }

    let metadataWorking: unknown = counselor.profile_metadata;
    let metadataUpdated = false;

    if (plan_settings) {
      const normalized = {
        ...DEFAULT_COUNSELOR_PLAN_SELECTION,
        ...plan_settings
      };
      metadataWorking = mergePlanSelectionIntoMetadata(metadataWorking, normalized);
      metadataUpdated = true;
    }

    const socialProvided = [line_url, x_url, instagram_url].some((value) => value !== undefined);
    if (socialProvided) {
      metadataWorking = mergeCounselorSocialLinks(metadataWorking, {
        line: line_url ?? null,
        x: x_url ?? null,
        instagram: instagram_url ?? null
      });
      metadataUpdated = true;
    }

    if (metadataUpdated) {
      updates.profile_metadata = metadataWorking as Record<string, unknown>;
    }

    const updated = await updateCounselorProfile(counselor.id, updates);
    return NextResponse.json({ counselor: updated });
  } catch (error) {
    console.error("Failed to update counselor profile", error);
    return NextResponse.json({ error: "Failed to update counselor profile" }, { status: 500 });
  }
}
