import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { listCounselorsForAdmin } from "@/server/services/admin";
import { ensureAdmin } from "../_lib/ensure-admin";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin counselors");
  if (response) return response;

  try {
    const counselors = await listCounselorsForAdmin();
    return NextResponse.json({ counselors });
  } catch (error) {
    console.error("Failed to load counselors", error);
    return NextResponse.json({ error: "Failed to load counselors" }, { status: 500 });
  }
}
