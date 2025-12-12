import { NextResponse } from "next/server";
import { z } from "zod";

import { getPublicFeedEntryById, incrementFeedShareCount } from "@/server/services/feed";

const paramsSchema = z.object({
  entryId: z.string().uuid()
});

export async function POST(_: Request, context: { params: { entryId: string } }) {
  const { entryId } = paramsSchema.parse(context.params);
  try {
    const entry = await getPublicFeedEntryById(entryId);
    if (!entry || !entry.isShareable) {
      return NextResponse.json({ error: "This diary entry cannot be shared." }, { status: 400 });
    }

    const shareCount = await incrementFeedShareCount(entryId);
    return NextResponse.json({ shareCount });
  } catch (error) {
    console.error("Failed to record feed share", error);
    return NextResponse.json({ error: "Failed to record share" }, { status: 500 });
  }
}
