import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Get diary reminder setting");
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("diary_reminder_enabled")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load diary reminder setting", error.message);
      return NextResponse.json({ error: "設定の取得に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ 
      diaryReminderEnabled: profile?.diary_reminder_enabled ?? true 
    }, { status: 200 });
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  let user;

  try {
    user = await getRouteUser(supabase, "Update diary reminder setting");
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { error } = await admin
    .from("profiles")
    .upsert(
      { id: user.id, diary_reminder_enabled: body.enabled },
      { onConflict: "id" }
    );

  if (error) {
    console.error("Failed to update diary reminder setting", error.message);
    return NextResponse.json({ error: "設定の更新に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ 
    diaryReminderEnabled: body.enabled 
  }, { status: 200 });
}
