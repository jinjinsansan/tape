import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getSelfEsteemTestStatus } from "@/server/services/self-esteem-test";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const user = await getRouteUser(supabase, "Self esteem status");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getSelfEsteemTestStatus(supabase, user.id);
    return NextResponse.json({ status });
  } catch (error) {
    console.error("Failed to load self esteem test status", error);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
