import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  
  try {
    const user = await getRouteUser(supabase, "Get counselor accepting status");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const { data: counselor, error } = await admin
      .from("counselors")
      .select("accepting_bookings")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!counselor) {
      return NextResponse.json({ error: "Counselor not found" }, { status: 404 });
    }

    return NextResponse.json({ accepting_bookings: counselor.accepting_bookings });
  } catch (error) {
    console.error("Failed to get accepting status", error);
    return NextResponse.json({ error: "Failed to get accepting status" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  
  try {
    const user = await getRouteUser(supabase, "Update counselor accepting status");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { accepting_bookings } = body;

    if (typeof accepting_bookings !== "boolean") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const { error } = await admin
      .from("counselors")
      .update({ accepting_bookings })
      .eq("auth_user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ accepting_bookings });
  } catch (error) {
    console.error("Failed to update accepting status", error);
    return NextResponse.json({ error: "Failed to update accepting status" }, { status: 500 });
  }
}
