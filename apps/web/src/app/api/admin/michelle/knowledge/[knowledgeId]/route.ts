import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { deleteMichelleKnowledgeParent } from "@/server/services/admin";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

const paramsSchema = z.object({ knowledgeId: z.string().uuid() });

export async function DELETE(_: Request, context: { params: { knowledgeId: string } }) {
  const { knowledgeId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin delete knowledge");
  if (response) return response;

  try {
    await deleteMichelleKnowledgeParent(knowledgeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete knowledge", error);
    return NextResponse.json({ error: "Failed to delete knowledge" }, { status: 500 });
  }
}
