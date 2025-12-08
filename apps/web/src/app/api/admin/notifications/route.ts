import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { listRecentNotifications } from "@/server/services/admin";
import { ensureAdmin } from "../_lib/ensure-admin";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin notifications");
  if (response) return response;

  try {
    const notifications = await listRecentNotifications();
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Failed to load notifications", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
