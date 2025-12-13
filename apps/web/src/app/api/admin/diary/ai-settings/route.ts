import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import type { Database } from "@tape/supabase";

const SETTINGS_KEY = "michelle_ai_delay_minutes";

const patchSchema = z.object({
  delayMinutes: z.number().min(1).max(1440),
});

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createSupabaseRouteClient<Database>(cookieStore);

    // Get settings from database
    const { data, error } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    // value is jsonb, so we need to extract the number
    let delayMinutes = 1;
    if (data?.value) {
      if (typeof data.value === 'number') {
        delayMinutes = data.value;
      } else if (typeof data.value === 'object' && data.value !== null && 'value' in data.value) {
        delayMinutes = Number(data.value.value) || 1;
      }
    }

    return NextResponse.json({ delayMinutes });
  } catch (error) {
    console.error("Failed to get AI settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createSupabaseRouteClient<Database>(cookieStore);

    // Upsert settings (value is jsonb)
    const { error } = await supabase
      .from("admin_settings")
      .upsert({
        key: SETTINGS_KEY,
        value: parsed.data.delayMinutes as any,
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
