import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import type { Database } from "@tape/supabase";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { updatePointRule } from "@/server/services/points";

const paramsSchema = z.object({ action: z.string() });
const bodySchema = z.object({
  points: z.coerce.number().int().min(0).optional(),
  description: z.string().max(200).optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(request: Request, context: { params: { action: string } }) {
  const { action } = paramsSchema.parse(context.params);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response, user } = await ensureAdmin(supabase, "Update point rule");
  if (response) return response;

  try {
    const rule = await updatePointRule(action as Database["public"]["Enums"]["point_action"], {
      points: parsed.data.points,
      description: parsed.data.description,
      is_active: parsed.data.isActive
    }, user!.id);
    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Failed to update point rule", error);
    return NextResponse.json({ error: "Failed to update point rule" }, { status: 500 });
  }
}
