import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { reactToFeedEntry, removeFeedReaction } from "@/server/services/feed";

const paramsSchema = z.object({ entryId: z.string().uuid() });
const bodySchema = z.object({ reactionType: z.string().min(1).max(32) });

const handleAuthError = (error: unknown) => {
  if (error instanceof SupabaseAuthUnavailableError) {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
  return null;
};

export async function POST(request: Request, context: { params: { entryId: string } }) {
  const { entryId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let userId: string;
  try {
    const user = await getRouteUser(supabase, "Feed reaction add");
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
    return NextResponse.json({ error: "Invalid reaction payload" }, { status: 400 });
  }

  try {
    await reactToFeedEntry(entryId, userId, parsed.data.reactionType);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to add reaction", error);
    return NextResponse.json({ error: "Failed to add reaction" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: { entryId: string } }) {
  const { entryId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let userId: string;
  try {
    const user = await getRouteUser(supabase, "Feed reaction remove");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } catch (error) {
    const response = handleAuthError(error);
    if (response) return response;
    throw error;
  }

  try {
    await removeFeedReaction(entryId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove reaction", error);
    return NextResponse.json({ error: "Failed to remove reaction" }, { status: 500 });
  }
}
