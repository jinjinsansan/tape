import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { ensureAdmin } from "../../../_lib/ensure-admin";

const paramsSchema = z.object({ entryId: z.string().uuid() });
const bodySchema = z.object({ visibility: z.enum(["public", "private"]) });

export async function PATCH(request: Request, context: { params: { entryId: string } }) {
  const { entryId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response, user } = await ensureAdmin(supabase, "Admin update diary visibility");
  if (response) return response;

  const adminSupabase = getSupabaseAdminClient();

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const { error: updateError } = await adminSupabase
      .from("emotion_diary_entries")
      .update({
        visibility: parsed.data.visibility,
        published_at: parsed.data.visibility === "public" ? new Date().toISOString() : null
      })
      .eq("id", entryId);

    if (updateError) {
      throw updateError;
    }

    const { error: logError } = await adminSupabase.from("emotion_diary_moderation_log").insert({
      entry_id: entryId,
      moderator_user_id: user!.id,
      action: `visibility_${parsed.data.visibility}`
    });

    if (logError) {
      throw logError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update diary visibility", error);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}
