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
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const { response, user } = await requireUser(supabase, "Diary entry update", accessToken);
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

  const updatePayload: Record<string, unknown> = {};
  if (payload.title !== undefined) updatePayload.title = payload.title;
  if (payload.content !== undefined) updatePayload.content = payload.content;
  if (payload.moodScore !== undefined) updatePayload.mood_score = payload.moodScore;
  if (payload.moodLabel !== undefined) updatePayload.mood_label = payload.moodLabel;
  if (payload.moodColor !== undefined) updatePayload.mood_color = payload.moodColor;
  if (payload.energyLevel !== undefined) updatePayload.energy_level = payload.energyLevel;
  if (payload.emotionLabel !== undefined) updatePayload.emotion_label = payload.emotionLabel;
  if (payload.eventSummary !== undefined) updatePayload.event_summary = payload.eventSummary;
  if (payload.realization !== undefined) updatePayload.realization = payload.realization;
  if (payload.selfEsteemScore !== undefined) updatePayload.self_esteem_score = payload.selfEsteemScore;
  if (payload.worthlessnessScore !== undefined) updatePayload.worthlessness_score = payload.worthlessnessScore;
  if (visibility !== undefined) updatePayload.visibility = visibility;
  if (payload.journalDate !== undefined) updatePayload.journal_date = payload.journalDate;
  if (published_at !== undefined) updatePayload.published_at = published_at;

  try {
    const entry = await updateDiaryEntry(
      supabase,
      entryId,
      user!.id,
      updatePayload as any,
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

export async function DELETE(request: Request, context: { params: { entryId: string } }) {
  const { entryId } = paramsSchema.parse(context.params);
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);

  const { response, user } = await requireUser(supabase, "Diary entry delete", accessToken);
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
