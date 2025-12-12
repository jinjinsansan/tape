import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getPublicFeedEntryById, incrementFeedShareCount } from "@/server/services/feed";
import { awardPoints } from "@/server/services/points";

const paramsSchema = z.object({
  entryId: z.string().uuid()
});

const bodySchema = z
  .object({
    platform: z.enum(["copy", "x", "line"]).optional()
  })
  .optional();

export async function POST(request: Request, context: { params: { entryId: string } }) {
  const { entryId } = paramsSchema.parse(context.params);
  try {
    const entry = await getPublicFeedEntryById(entryId);
    if (!entry || !entry.isShareable) {
      return NextResponse.json({ error: "This diary entry cannot be shared." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.parse(body ?? undefined);

    const shareCount = await incrementFeedShareCount(entryId);

    if (parsed?.platform === "x") {
      try {
        const cookieStore = cookies();
        const supabase = createSupabaseRouteClient(cookieStore);
        const user = await getRouteUser(supabase, "Feed share");
        if (user) {
          await awardPoints({ userId: user.id, action: "feed_share_x", referenceId: entryId });
        }
      } catch (awardError) {
        console.error("Failed to award share points", awardError);
      }
    }

    return NextResponse.json({ shareCount });
  } catch (error) {
    console.error("Failed to record feed share", error);
    return NextResponse.json({ error: "Failed to record share" }, { status: 500 });
  }
}
