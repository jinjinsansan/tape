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

  console.log("[GET /api/diary/entries] Auth header present:", !!authHeader, "Token extracted:", !!accessToken);

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);

  let userId: string | undefined;
  if (scope === "me") {
    const { response, user } = await requireUser(supabase, "Diary entries list", accessToken);
    if (response) {
      console.log("[GET /api/diary/entries] Auth failed, returning 401");
      return response;
    }
    console.log("[GET /api/diary/entries] Auth succeeded, user:", user!.id);
    userId = user!.id;
  }

  try {
    console.log("[GET /api/diary/entries] Fetching entries with scope:", scope, "userId:", userId);
    const entries = await listDiaryEntries(supabase, {
      scope,
      userId,
      limit: limit ?? (scope === "public" ? 30 : 50)
    });
    console.log("[GET /api/diary/entries] Found", entries.length, "entries");
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[GET /api/diary/entries] Error:", error);
    return NextResponse.json({ error: "Failed to load diary entries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;

  console.log("[POST /api/diary/entries] Auth header present:", !!authHeader, "Token extracted:", !!accessToken);

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);

  const { response, user } = await requireUser(supabase, "Diary entry create", accessToken);
  if (response) {
    console.log("[POST /api/diary/entries] Auth failed, returning 401");
    return response;
  }

  console.log("[POST /api/diary/entries] Auth succeeded, user:", user!.id);

  const body = await request.json().catch(() => null);
  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) {
    console.log("[POST /api/diary/entries] Validation failed:", parsed.error);
    return NextResponse.json({ error: "Invalid diary entry payload" }, { status: 400 });
  }

  const data = parsed.data;
  const feelings = (data.feelings ?? []) as DiaryFeelingInput[];
  const visibility = (data.visibility ?? "private") as DiaryVisibility;
  const published_at = visibility === "public" ? new Date().toISOString() : null;

  try {
    console.log("[POST /api/diary/entries] Creating entry for user:", user!.id);
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
      published_at
    }, feelings);

    console.log("[POST /api/diary/entries] Entry created successfully:", entry.id);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/diary/entries] Error:", error);
    return NextResponse.json({ error: "Failed to create diary entry" }, { status: 500 });
  }
}
