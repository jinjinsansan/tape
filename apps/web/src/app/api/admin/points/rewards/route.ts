import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { createPointReward } from "@/server/services/points";

const bodySchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  costPoints: z.coerce.number().int().min(1),
  stock: z.coerce.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    console.error("[Create Reward] Validation failed:", parsed.error.flatten());
    return NextResponse.json({ 
      error: "Invalid payload", 
      details: parsed.error.flatten().fieldErrors 
    }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Create point reward");
  if (response) return response;

  try {
    const reward = await createPointReward({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      image_url: (parsed.data.imageUrl && parsed.data.imageUrl !== "") ? parsed.data.imageUrl : null,
      cost_points: parsed.data.costPoints,
      stock: parsed.data.stock ?? null,
      is_active: parsed.data.isActive ?? true,
      metadata: {}
    });
    return NextResponse.json({ reward });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Create Reward] Failed:", errorMessage, error);
    return NextResponse.json({ 
      error: `Failed to create point reward: ${errorMessage}` 
    }, { status: 500 });
  }
}
