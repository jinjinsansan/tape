import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { adjustWalletBalance } from "@/server/services/admin";
import { ensureAdmin } from "../../../_lib/ensure-admin";

const paramsSchema = z.object({ userId: z.string().uuid() });
const bodySchema = z.object({
  amountCents: z.number().int().positive(),
  direction: z.enum(["credit", "debit"]),
  reason: z.string().max(200).optional()
});

export async function POST(request: Request, context: { params: { userId: string } }) {
  const { userId } = paramsSchema.parse(context.params);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin wallet adjust");
  if (response) return response;

  try {
    await adjustWalletBalance(userId, parsed.data.amountCents, parsed.data.direction, parsed.data.reason);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Wallet adjustment failed", error);
    return NextResponse.json({ error: "Wallet adjustment failed" }, { status: 500 });
  }
}
