import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getSupabaseAdminClient } from "@/server/supabase";
import { sendOnboardingEmail } from "@/server/services/onboarding-emails";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const authHeader = request.headers.get("authorization") ?? undefined;
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : undefined;

  try {
    const user = await getRouteUser(supabase, "Send onboarding email now", accessToken);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const forceRestart = Boolean(body?.forceRestart);

    const admin = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("onboarding_email_step")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const currentStep = profile?.onboarding_email_step ?? 0;
    if (!forceRestart && currentStep >= 1) {
      return NextResponse.json({ skipped: true });
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await admin
      .from("profiles")
      .upsert({
        id: user.id,
        onboarding_email_enabled: true,
        onboarding_email_completed: false,
        onboarding_email_step: 1,
        onboarding_email_started_at: nowIso
      });

    if (updateError) {
      throw updateError;
    }

    const success = await sendOnboardingEmail(user.id, 1);
    if (!success) {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send onboarding email immediately", error);
    return NextResponse.json({ error: "Failed to send onboarding email" }, { status: 500 });
  }
}
