import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { listUsersForAdmin } from "@/server/services/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? undefined;

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response } = await ensureAdmin(supabase, "Admin list users");
  if (response) return response;

  try {
    const users = await listUsersForAdmin(search);
    return NextResponse.json({ users, userRole: "admin" });
  } catch (error) {
    console.error("Failed to load admin users", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
