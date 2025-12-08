import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { getIntroMessages, postIntroMessage } from "@/server/services/counselors";

const paramsSchema = z.object({ slug: z.string().min(1), chatId: z.string().uuid() });
const bodySchema = z.object({ body: z.string().min(1).max(2000) });

const handleAuthError = (error: unknown) => {
  if (error instanceof SupabaseAuthUnavailableError) {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
  return null;
};

export async function GET(_: Request, context: { params: { slug: string; chatId: string } }) {
  const { chatId } = paramsSchema.parse(context.params);
  try {
    const messages = await getIntroMessages(chatId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to load intro messages", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: { slug: string; chatId: string } }) {
  const { chatId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let userId: string;
  try {
    const user = await getRouteUser(supabase, `Intro chat message: ${chatId}`);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } catch (error) {
    const response = handleAuthError(error);
    if (response) return response;
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message payload" }, { status: 400 });
  }

  try {
    await postIntroMessage({ chatId, senderUserId: userId, body: parsed.data.body });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to post intro message", error);
    return NextResponse.json({ error: "Failed to post message" }, { status: 500 });
  }
}
