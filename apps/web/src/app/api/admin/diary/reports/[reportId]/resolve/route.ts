import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

const paramsSchema = z.object({ reportId: z.string().uuid() });
const bodySchema = z.object({ note: z.string().max(500).optional() });

export async function POST(request: Request, context: { params: { reportId: string } }) {
  const { reportId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response, user } = await ensureAdmin(supabase, "Admin resolve report");
  if (response) return response;

  const adminSupabase = getSupabaseAdminClient();

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const { data: report, error: loadError } = await adminSupabase
      .from("emotion_diary_reports")
      .select("id, entry_id, status")
      .eq("id", reportId)
      .maybeSingle();

    if (loadError || !report) {
      throw loadError ?? new Error("Report not found");
    }

    const { error: updateError } = await adminSupabase
      .from("emotion_diary_reports")
      .update({ status: "resolved", resolved_at: new Date().toISOString(), resolution_note: parsed.data.note ?? null })
      .eq("id", reportId);

    if (updateError) {
      throw updateError;
    }

    const { error: logError } = await adminSupabase.from("emotion_diary_moderation_log").insert({
      entry_id: report.entry_id,
      moderator_user_id: user!.id,
      action: "report_resolved",
      note: parsed.data.note ?? null
    });

    if (logError) {
      throw logError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to resolve report", error);
    return NextResponse.json({ error: "Failed to resolve report" }, { status: 500 });
  }
}
