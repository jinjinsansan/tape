import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getKnowledgeChunkById } from "@/server/services/knowledge";

const paramsSchema = z.object({
  chunkId: z.string()
});

export async function GET(_: Request, context: { params: { chunkId: string } }) {
  const { chunkId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin comics chunk detail");
  if (response) return response;

  const chunk = await getKnowledgeChunkById(chunkId);
  if (!chunk) {
    return NextResponse.json({ error: "Chunk not found" }, { status: 404 });
  }

  return NextResponse.json({ chunk });
}
