import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import {
  getDelayOptions,
  getDiaryAiCommentStats,
  getDiaryAiDelayMinutes,
  updateDiaryAiDelayMinutes
} from "@/server/services/diary-ai-comments";

const updateSchema = z.object({
  delayMinutes: z.number().int().positive()
});

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin diary AI settings");
  if (response) return response;

  const [delayMinutes, stats] = await Promise.all([
    getDiaryAiDelayMinutes(),
    getDiaryAiCommentStats()
  ]);

  return NextResponse.json({
    delayMinutes,
    options: getDelayOptions(),
    stats
  });
}

export async function PUT(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Update diary AI settings");
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const delay = getDelayOptions().find((option) => option === parsed.data.delayMinutes);
  if (!delay) {
    return NextResponse.json({ error: "Unsupported delay" }, { status: 400 });
  }

  await updateDiaryAiDelayMinutes(delay);

  return NextResponse.json({ delayMinutes: delay });
}
