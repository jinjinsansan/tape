import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { getInitialScore, listEntriesForTrend } from "@/server/services/diary";

const querySchema = z.object({
  range: z.enum(["week", "month", "all"]).optional().default("week")
});

const handleAuthError = (error: unknown) => {
  if (error instanceof SupabaseAuthUnavailableError) {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
  return null;
};

const requireUser = async (
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  context: string,
  accessToken?: string | null
) => {
  try {
    const user = await getRouteUser(supabase, context, accessToken ?? undefined);
    if (!user) {
      return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
    }
    return { response: null, user };
  } catch (error) {
    const response = handleAuthError(error);
    if (response) {
      return { response, user: null };
    }
    throw error;
  }
};

const dateFromRange = (range: "week" | "month" | "all") => {
  if (range === "all") return null;
  const now = new Date();
  const days = range === "week" ? 7 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const { response, user } = await requireUser(supabase, "Worthlessness trend", accessToken);
  if (response) {
    return response;
  }

  try {
    const [initialScore, rawEntries] = await Promise.all([
      getInitialScore(supabase, user!.id),
      listEntriesForTrend(supabase, user!.id)
    ]);

    const startDate = dateFromRange(parsed.data.range);
    const filteredEntries = rawEntries.filter((entry) => {
      if (entry.self_esteem_score == null || entry.worthlessness_score == null) {
        return false;
      }
      if (!startDate) return true;
      return new Date(entry.journal_date) >= startDate;
    });

    const pointsMap = new Map<string, { date: string; selfEsteemScore: number; worthlessnessScore: number; entryId?: string | null }>();
    const addPoint = (date: string, esteem: number, worthlessness: number, entryId?: string | null) => {
      if (!pointsMap.has(date)) {
        pointsMap.set(date, {
          date,
          selfEsteemScore: esteem,
          worthlessnessScore: worthlessness,
          entryId: entryId ?? null
        });
      }
    };

    filteredEntries.forEach((entry) => {
      addPoint(
        entry.journal_date,
        entry.self_esteem_score ?? 0,
        entry.worthlessness_score ?? 0,
        entry.id
      );
    });

    if (initialScore) {
      const measuredDate = new Date(initialScore.measured_on);
      if (!startDate || measuredDate >= startDate) {
        addPoint(
          initialScore.measured_on,
          initialScore.self_esteem_score,
          initialScore.worthlessness_score,
          null
        );
      }
    }

    const chart = Array.from(pointsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const allEmotionCounts: Record<string, number> = {};
    rawEntries.forEach((entry) => {
      if (entry.emotion_label) {
        allEmotionCounts[entry.emotion_label] = (allEmotionCounts[entry.emotion_label] ?? 0) + 1;
      }
    });

    const filteredEmotionCounts: Record<string, number> = {};
    filteredEntries.forEach((entry) => {
      if (entry.emotion_label) {
        filteredEmotionCounts[entry.emotion_label] = (filteredEmotionCounts[entry.emotion_label] ?? 0) + 1;
      }
    });

    return NextResponse.json({
      chart,
      emotions: {
        all: allEmotionCounts,
        filtered: filteredEmotionCounts
      },
      initialScore
    });
  } catch (error) {
    console.error("Failed to load worthlessness trend", error);
    return NextResponse.json({ error: "Failed to load worthlessness trend" }, { status: 500 });
  }
}
