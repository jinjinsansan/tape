import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { updatePointReward } from "@/server/services/points";

const paramsSchema = z.object({ rewardId: z.string().uuid() });
const bodySchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  costPoints: z.coerce.number().int().min(1).optional(),
  stock: z.coerce.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(request: Request, context: { params: { rewardId: string } }) {
  const { rewardId } = paramsSchema.parse(context.params);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Update point reward");
  if (response) return response;

  try {
    const reward = await updatePointReward(rewardId, {
      title: parsed.data.title,
      description: parsed.data.description,
      image_url: parsed.data.imageUrl ?? undefined,
      cost_points: parsed.data.costPoints,
      stock: parsed.data.stock ?? undefined,
      is_active: parsed.data.isActive
    });
    return NextResponse.json({ reward });
  } catch (error) {
    console.error("Failed to update point reward", error);
    return NextResponse.json({ error: "Failed to update point reward" }, { status: 500 });
  }
}
