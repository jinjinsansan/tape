import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { updateCounselorActive } from "@/server/services/admin";
import { ensureAdmin } from "../../../_lib/ensure-admin";

const paramsSchema = z.object({ counselorId: z.string().uuid() });
const bodySchema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, context: { params: { counselorId: string } }) {
  const { counselorId } = paramsSchema.parse(context.params);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin counselor active");
  if (response) return response;

  try {
    await updateCounselorActive(counselorId, parsed.data.isActive);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update counselor", error);
    return NextResponse.json({ error: "Failed to update counselor" }, { status: 500 });
  }
}
