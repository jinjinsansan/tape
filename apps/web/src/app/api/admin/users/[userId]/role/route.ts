import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "../../../_lib/ensure-admin";
import { updateUserRole } from "@/server/services/admin";

const paramsSchema = z.object({ userId: z.string().uuid() });
const bodySchema = z.object({ role: z.string().min(3).max(32) });

export async function PATCH(request: Request, context: { params: { userId: string } }) {
  const { userId } = paramsSchema.parse(context.params);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin update role");
  if (response) return response;

  try {
    await updateUserRole(userId, parsed.data.role);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user role", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}
