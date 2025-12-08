import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { listPublicFeed } from "@/server/services/feed";

const querySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(20).optional()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = querySchema.parse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined
  });

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let viewerId: string | null = null;
  try {
    const user = await getRouteUser(supabase, "Feed list");
    viewerId = user?.id ?? null;
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    throw error;
  }

  try {
    const feed = await listPublicFeed({
      limit: params.limit,
      cursor: params.cursor ?? null,
      viewerId
    });
    return NextResponse.json(feed);
  } catch (error) {
    console.error("Failed to load feed", error);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }
}
