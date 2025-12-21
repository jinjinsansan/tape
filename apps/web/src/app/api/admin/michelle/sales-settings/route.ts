import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getMichelleSalesSettings, updateMichelleSalesSettings } from "@/server/services/michelle-sales";
import type { Database } from "@tape/supabase";

const patchSchema = z.object({
  psychologyEnabled: z.boolean(),
  attractionEnabled: z.boolean()
});

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createSupabaseRouteClient<Database>(cookieStore);
    const { response } = await ensureAdmin(supabase, "Admin Michelle sales settings GET");
    if (response) return response;

    const settings = await getMichelleSalesSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to load Michelle sales settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createSupabaseRouteClient<Database>(cookieStore);
    const { response } = await ensureAdmin(supabase, "Admin Michelle sales settings PATCH");
    if (response) return response;

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await updateMichelleSalesSettings(parsed.data);
    const settings = await getMichelleSalesSettings();

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to update Michelle sales settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
