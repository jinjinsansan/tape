import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import type { DiaryVisibility } from "@tape/supabase";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import {
  fetchDiaryEntryById,
  updateDiaryEntry,
  deleteDiaryEntry,
  type DiaryFeelingInput
} from "@/server/services/diary";
import { updateEntrySchema } from "../_schemas";

const paramsSchema = z.object({
  entryId: z.string().uuid()
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

const requireUser = async (supabase: ReturnType<typeof createSupabaseRouteClient>, context: string) => {
  try {
    const user = await getRouteUser(supabase, context);
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

export async function GET(_: Request, context: { params: { entryId: string } }) {
  const { entryId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let viewerId: string | null = null;
  try {
    const viewer = await getRouteUser(supabase, "Diary entry detail");
    viewerId = viewer?.id ?? null;
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) {
      return authResponse;
    }
    throw error;
  }

  try {
    const entry = await fetchDiaryEntryById(supabase, entryId, viewerId);
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Failed to load diary entry", error);
    return NextResponse.json({ error: "Failed to load diary entry" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: { entryId: string } }) {
  const { entryId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response, user } = await requireUser(supabase, "Diary entry update");
  if (response) {
    return response;
  }

  const existing = await fetchDiaryEntryById(supabase, entryId, user!.id);
  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid diary entry payload" }, { status: 400 });
  }

  const payload = parsed.data;
  const feelings = payload.feelings as DiaryFeelingInput[] | undefined;
  const visibility = payload.visibility as DiaryVisibility | undefined;

  let published_at: string | null | undefined;
  if (visibility) {
    if (visibility === "public") {
      published_at = existing.published_at ?? new Date().toISOString();
    } else {
      published_at = null;
    }
  }

  try {
    const entry = await updateDiaryEntry(
      supabase,
      entryId,
      user!.id,
      {
        title: payload.title ?? undefined,
        content: payload.content ?? undefined,
        mood_score: payload.moodScore,
        mood_label: payload.moodLabel,
        mood_color: payload.moodColor,
        energy_level: payload.energyLevel,
        emotion_label: payload.emotionLabel,
        event_summary: payload.eventSummary,
        realization: payload.realization,
        self_esteem_score: payload.selfEsteemScore,
        worthlessness_score: payload.worthlessnessScore,
        visibility,
        journal_date: payload.journalDate,
        published_at
      },
      feelings
    );

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Failed to update diary entry", error);
    return NextResponse.json({ error: "Failed to update diary entry" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: { entryId: string } }) {
  const { entryId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response, user } = await requireUser(supabase, "Diary entry delete");
  if (response) {
    return response;
  }

  const existing = await fetchDiaryEntryById(supabase, entryId, user!.id);
  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  try {
    await deleteDiaryEntry(supabase, entryId, user!.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete diary entry", error);
    return NextResponse.json({ error: "Failed to delete diary entry" }, { status: 500 });
  }
}
