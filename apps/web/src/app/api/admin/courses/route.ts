import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { listCoursesForAdmin } from "@/server/services/admin";
import { ensureAdmin } from "../_lib/ensure-admin";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin courses");
  if (response) return response;

  try {
    const courses = await listCoursesForAdmin();
    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Failed to load courses", error);
    return NextResponse.json({ error: "Failed to load courses" }, { status: 500 });
  }
}
