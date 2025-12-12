import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { awardPoints } from "@/server/services/points";

const paramsSchema = z.object({ userId: z.string().uuid() });
const bodySchema = z.object({
  points: z.number().int().min(1).max(100000),
  reason: z.string().max(200).optional()
});

export async function POST(request: Request, context: { params: { userId: string } }) {
  const { userId } = paramsSchema.parse(context.params);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response, user } = await ensureAdmin(supabase, "Award points to user");
  if (response) return response;

  try {
    const pointEvent = await awardPoints({
      userId,
      action: "admin_adjustment",
      metadata: {
        points: parsed.data.points,
        reason: parsed.data.reason ?? null,
        admin_user_id: user!.id
      }
    });

    return NextResponse.json({ pointEvent });
  } catch (error) {
    console.error("Failed to award points", error);
    return NextResponse.json({ error: "Failed to award points" }, { status: 500 });
  }
}
