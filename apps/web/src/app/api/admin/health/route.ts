import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSystemHealth } from "@/server/services/admin";
import { ensureAdmin } from "../_lib/ensure-admin";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin system health");
  if (response) return response;

  try {
    const health = await getSystemHealth();
    return NextResponse.json({ health });
  } catch (error) {
    console.error("Failed to load health status", error);
    return NextResponse.json({ error: "Failed to load health status" }, { status: 500 });
  }
}
