import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { listMichelleKnowledge } from "@/server/services/admin";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin knowledge");
  if (response) return response;

  try {
    const items = await listMichelleKnowledge();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to load knowledge", error);
    return NextResponse.json({ error: "Failed to load knowledge" }, { status: 500 });
  }
}
