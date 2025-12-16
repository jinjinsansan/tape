import { NextResponse } from "next/server";

import { getPublicFeedEntryById } from "@/server/services/feed";
import { generateDiaryShareCard } from "@/server/services/share-card";

type RouteContext = {
  params: { entryId: string };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const entry = await getPublicFeedEntryById(params.entryId);
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (!entry.isShareable) {
      return NextResponse.json({ error: "This entry is not shareable" }, { status: 403 });
    }

    const buffer = await generateDiaryShareCard({
      title: entry.title,
      content: entry.content,
      moodLabel: entry.moodLabel,
      feelings: entry.feelings.map((feeling) => feeling.label),
      journalDate: entry.journalDate,
      authorName: entry.author.displayName
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, s-maxage=600, max-age=600"
      }
    });
  } catch (error) {
    console.error("Failed to generate share card", error);
    return NextResponse.json({ error: "Failed to generate share card" }, { status: 500 });
  }
}
