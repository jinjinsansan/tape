import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { listBroadcasts, sendBroadcast } from "@/server/services/broadcasts";

const broadcastSchema = z.object({
  subject: z.string().min(1).max(120),
  body: z.string().min(1).max(5000),
  audience: z.enum(["all", "selected"]),
  recipients: z.array(z.string().uuid()).optional()
});

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin list broadcasts");
  if (response) return response;

  try {
    const broadcasts = await listBroadcasts();
    return NextResponse.json({ broadcasts });
  } catch (error) {
    console.error("Failed to list broadcasts", error);
    return NextResponse.json({ error: "配信履歴の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = broadcastSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  if (parsed.data.audience === "selected" && (!parsed.data.recipients || parsed.data.recipients.length === 0)) {
    return NextResponse.json({ error: "個別配信の対象を選択してください" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response, user } = await ensureAdmin(supabase, "Admin create broadcast");
  if (response || !user) return response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await sendBroadcast({
      authorId: user.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
      audience: parsed.data.audience,
      recipientIds: parsed.data.recipients
    });

    return NextResponse.json({ broadcast: result.broadcast, stats: result.stats });
  } catch (error) {
    console.error("Failed to send broadcast", error);
    return NextResponse.json({ error: (error as Error).message ?? "配信に失敗しました" }, { status: 500 });
  }
}
