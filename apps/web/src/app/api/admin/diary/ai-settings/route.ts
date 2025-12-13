import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import type { Database } from "@tape/supabase";

const SETTINGS_KEY = "michelle_ai_delay_minutes";
const DEFAULT_DELAY_MINUTES = 1;

const patchSchema = z.object({
  delayMinutes: z.number().min(1).max(1440),
});

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createSupabaseRouteClient<Database>(cookieStore);

    const { response } = await ensureAdmin(supabase, "Admin AI settings GET");
    if (response) return response;

    // Get settings from database
    const { data, error } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    // value is jsonb stored as number directly
    const delayMinutes = typeof data?.value === 'number' ? data.value : DEFAULT_DELAY_MINUTES;

    return NextResponse.json({ delayMinutes });
  } catch (error) {
    console.error("Failed to get AI settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createSupabaseRouteClient<Database>(cookieStore);

    const { response } = await ensureAdmin(supabase, "Admin AI settings PATCH");
    if (response) return response;

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Upsert settings (value is jsonb, stored as number)
    const { error } = await supabase
      .from("admin_settings")
      .upsert({
        key: SETTINGS_KEY,
        value: parsed.data.delayMinutes,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update AI settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
