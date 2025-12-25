import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Get onboarding email setting");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("onboarding_email_enabled")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      onboardingEmailEnabled: profile?.onboarding_email_enabled ?? true
    });
  } catch (error) {
    console.error("Failed to get onboarding email setting", error);
    return NextResponse.json({ error: "Failed to get setting" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Update onboarding email setting");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const nowIso = new Date().toISOString();

    const updates: Record<string, unknown> = {
      id: user.id,
      onboarding_email_enabled: enabled
    };

    if (enabled) {
      updates.onboarding_email_step = 0;
      updates.onboarding_email_completed = false;
      updates.onboarding_email_started_at = nowIso;
    }

    const { error } = await admin
      .from("profiles")
      .upsert(updates, { onConflict: "id" });

    if (error) {
      throw error;
    }

    return NextResponse.json({ onboardingEmailEnabled: enabled });
  } catch (error) {
    console.error("Failed to update onboarding email setting", error);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
