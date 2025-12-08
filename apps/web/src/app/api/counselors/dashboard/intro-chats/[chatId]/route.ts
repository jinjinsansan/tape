import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getCounselorByAuthUser, getIntroMessages, postIntroMessage } from "@/server/services/counselors";

const paramsSchema = z.object({ chatId: z.string().uuid() });
const bodySchema = z.object({ body: z.string().min(1).max(2000) });

const ensureChatAccess = async (chatId: string, counselorId: string) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("counselor_intro_chats")
    .select("id, booking:counselor_bookings(counselor_id)")
    .eq("id", chatId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data || data.booking?.counselor_id !== counselorId) {
    throw new Error("Forbidden");
  }
};

export async function GET(_: Request, context: { params: { chatId: string } }) {
  const { chatId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let userId: string;
  try {
    const user = await getRouteUser(supabase, "Counselor chat list");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
    }
    throw error;
  }

  try {
    const counselor = await getCounselorByAuthUser(userId);
    if (!counselor) {
      return NextResponse.json({ error: "Counselor profile not found" }, { status: 403 });
    }

    await ensureChatAccess(chatId, counselor.id);
    const messages = await getIntroMessages(chatId);
    return NextResponse.json({ messages });
  } catch (error) {
    if ((error as Error).message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to load intro chat messages", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: { chatId: string } }) {
  const { chatId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let userId: string;
  try {
    const user = await getRouteUser(supabase, "Counselor chat send");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
    }
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const counselor = await getCounselorByAuthUser(userId);
    if (!counselor) {
      return NextResponse.json({ error: "Counselor profile not found" }, { status: 403 });
    }

    await ensureChatAccess(chatId, counselor.id);
    await postIntroMessage({ chatId, senderUserId: userId, body: parsed.data.body, role: "counselor" });
    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as Error).message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to post intro message", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
