import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { deleteBroadcast } from "@/server/services/broadcasts";

const paramsSchema = z.object({
  broadcastId: z.string().uuid()
});

export async function DELETE(_: Request, context: { params: { broadcastId: string } }) {
  const parsed = paramsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid broadcast id" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin delete broadcast");
  if (response) return response;

  try {
    await deleteBroadcast(parsed.data.broadcastId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete broadcast", error);
    return NextResponse.json({ error: "配信履歴の削除に失敗しました" }, { status: 500 });
  }
}
