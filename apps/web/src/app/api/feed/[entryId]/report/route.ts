import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { reportFeedEntry } from "@/server/services/feed";

const paramsSchema = z.object({ entryId: z.string().uuid() });
const bodySchema = z.object({ reason: z.string().min(5).max(500) });

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
    const user = await getRouteUser(supabase, "Feed report");
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
    return NextResponse.json({ error: "Invalid report payload" }, { status: 400 });
  }

  try {
    await reportFeedEntry(entryId, userId, parsed.data.reason);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to report entry", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
