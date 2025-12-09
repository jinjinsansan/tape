import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import type { Database } from "@tape/supabase";
import { updateWalletStatus } from "@/server/services/admin";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

const paramsSchema = z.object({ userId: z.string().uuid() });
const bodySchema = z.object({ status: z.enum(["active", "locked"]) });

export async function PATCH(request: Request, context: { params: { userId: string } }) {
  const { userId } = paramsSchema.parse(context.params);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin wallet status");
  if (response) return response;

  try {
    await updateWalletStatus(userId, parsed.data.status as Database["public"]["Enums"]["wallet_status"]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update wallet status", error);
    return NextResponse.json({ error: "Failed to update wallet status" }, { status: 500 });
  }
}
