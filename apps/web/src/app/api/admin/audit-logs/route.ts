import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { listAuditLogs } from "@/server/services/admin";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin audit logs");
  if (response) return response;

  try {
    const logs = await listAuditLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to load audit logs", error);
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}
