import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { searchKnowledgeChunks } from "@/server/services/knowledge";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin comics chunk search");
  if (response) return response;

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? undefined;
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 30;
  const random = url.searchParams.get("random") === "1";

  const chunks = await searchKnowledgeChunks(query, limit, random);
  return NextResponse.json({ chunks });
}
