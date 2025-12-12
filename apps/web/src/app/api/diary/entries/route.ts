import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { DiaryVisibility } from "@tape/supabase";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import {
  createDiaryEntry,
  listDiaryEntries,
  type DiaryFeelingInput
} from "@/server/services/diary";
import { scheduleDiaryAiCommentJob } from "@/server/services/diary-ai-comments";
import { entrySchema, scopeSchema } from "./_schemas";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scopeParam = searchParams.get("scope");
  const parsedScope = scopeSchema.safeParse(scopeParam);
  const scope = parsedScope.success ? parsedScope.data : "me";
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : undefined;

  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);

  let userId: string | undefined;
  if (scope === "me") {
    const { response, user } = await requireUser(supabase, "Diary entries list", accessToken);
    if (response) {
      return response;
    }
    userId = user!.id;
  }

  try {
    const entries = await listDiaryEntries(supabase, {
      scope,
      userId,
      limit: limit ?? (scope === "public" ? 30 : 50)
    });
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Failed to list diary entries", error);
    return NextResponse.json({ error: "Failed to load diary entries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);

  const { response, user } = await requireUser(supabase, "Diary entry create", accessToken);
  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid diary entry payload" }, { status: 400 });
  }

  const data = parsed.data;
  const feelings = (data.feelings ?? []) as DiaryFeelingInput[];
  const visibility = (data.visibility ?? "private") as DiaryVisibility;
  const published_at = visibility === "public" ? new Date().toISOString() : null;

  try {
    const entry = await createDiaryEntry(supabase, user!.id, {
      title: data.title ?? null,
      content: data.content,
      mood_score: data.moodScore,
      mood_label: data.moodLabel ?? null,
      mood_color: data.moodColor ?? null,
      energy_level: data.energyLevel,
      emotion_label: data.emotionLabel ?? null,
      event_summary: data.eventSummary ?? null,
      realization: data.realization ?? null,
      self_esteem_score: data.selfEsteemScore ?? null,
      worthlessness_score: data.worthlessnessScore ?? null,
      visibility,
      journal_date: data.journalDate,
      published_at,
      is_ai_comment_public: data.isAiCommentPublic ?? false,
      is_counselor_comment_public: data.isCounselorCommentPublic ?? false
    }, feelings);

    if (entry) {
      scheduleDiaryAiCommentJob({
        entryId: entry.id,
        userId: user!.id,
        content: entry.content ?? ""
      }).catch((schedulerError) => {
        console.error("Failed to schedule diary AI comment", schedulerError);
      });
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Failed to create diary entry", error);
    return NextResponse.json({ error: "Failed to create diary entry" }, { status: 500 });
  }
}
