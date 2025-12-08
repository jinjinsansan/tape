import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  DiaryVisibility,
  DiaryAiCommentStatus
} from "@tape/supabase";

type Supabase = SupabaseClient<Database>;

export type DiaryFeelingInput = {
  label: string;
  intensity?: number;
  tone?: string | null;
};

export type DiaryEntryInput = {
  title?: string | null;
  content: string;
  mood_score?: number | null;
  mood_label?: string | null;
  mood_color?: string | null;
  energy_level?: number | null;
  visibility?: DiaryVisibility;
  journal_date?: string;
  published_at?: string | null;
  ai_comment_status?: DiaryAiCommentStatus;
};

export type DiaryEntryWithRelations = Database["public"]["Tables"]["emotion_diary_entries"]["Row"] & {
  feelings: Database["public"]["Tables"]["emotion_diary_entry_feelings"]["Row"][];
  reactions: Database["public"]["Tables"]["emotion_diary_reactions"]["Row"][];
};

const diarySelect = `
  id,
  user_id,
  title,
  content,
  mood_score,
  mood_label,
  mood_color,
  energy_level,
  visibility,
  ai_comment_status,
  ai_summary,
  ai_highlights,
  published_at,
  journal_date,
  created_at,
  updated_at,
  deleted_at,
  feelings:emotion_diary_entry_feelings(label,intensity,tone,created_at),
  reactions:emotion_diary_reactions(reaction_type,user_id,created_at)
`;

const withRelations = (entry: Record<string, unknown>): DiaryEntryWithRelations => {
  const typed = entry as DiaryEntryWithRelations;
  return {
    ...typed,
    feelings: typed.feelings ?? [],
    reactions: typed.reactions ?? []
  };
};

const syncFeelings = async (supabase: Supabase, entryId: string, feelings: DiaryFeelingInput[] | undefined) => {
  const safeFeelings = (feelings ?? []).filter((feeling) => feeling.label.trim().length > 0);
  const { error: deleteError } = await supabase
    .from("emotion_diary_entry_feelings")
    .delete()
    .eq("entry_id", entryId);

  if (deleteError) {
    throw deleteError;
  }

  if (!safeFeelings.length) {
    return;
  }

  const payload = safeFeelings.map((feeling) => ({
    entry_id: entryId,
    label: feeling.label.trim(),
    intensity: feeling.intensity ?? 50,
    tone: feeling.tone ?? null
  }));

  const { error: insertError } = await supabase
    .from("emotion_diary_entry_feelings")
    .insert(payload);

  if (insertError) {
    throw insertError;
  }
};

export const createDiaryEntry = async (
  supabase: Supabase,
  userId: string,
  payload: DiaryEntryInput,
  feelings?: DiaryFeelingInput[]
) => {
  const { data, error } = await supabase
    .from("emotion_diary_entries")
    .insert({
      user_id: userId,
      title: payload.title ?? null,
      content: payload.content,
      mood_score: payload.mood_score ?? null,
      mood_label: payload.mood_label ?? null,
      mood_color: payload.mood_color ?? null,
      energy_level: payload.energy_level ?? null,
      visibility: payload.visibility ?? "private",
      journal_date: payload.journal_date ?? undefined,
      published_at: payload.published_at ?? null,
      ai_comment_status: payload.ai_comment_status ?? "idle"
    })
    .select("id, user_id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to create diary entry");
  }

  await syncFeelings(supabase, data.id, feelings);
  return fetchDiaryEntryById(supabase, data.id, userId);
};

export const updateDiaryEntry = async (
  supabase: Supabase,
  entryId: string,
  userId: string,
  payload: DiaryEntryInput,
  feelings?: DiaryFeelingInput[]
) => {
  const { error } = await supabase
    .from("emotion_diary_entries")
    .update({
      title: payload.title ?? undefined,
      content: payload.content ?? undefined,
      mood_score: payload.mood_score ?? undefined,
      mood_label: payload.mood_label ?? undefined,
      mood_color: payload.mood_color ?? undefined,
      energy_level: payload.energy_level ?? undefined,
      visibility: payload.visibility ?? undefined,
      journal_date: payload.journal_date ?? undefined,
      published_at: payload.published_at ?? undefined,
      ai_comment_status: payload.ai_comment_status ?? undefined
    })
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  if (feelings) {
    await syncFeelings(supabase, entryId, feelings);
  }

  return fetchDiaryEntryById(supabase, entryId, userId);
};

export const fetchDiaryEntryById = async (
  supabase: Supabase,
  entryId: string,
  viewerId: string | null
) => {
  const { data, error } = await supabase
    .from("emotion_diary_entries")
    .select(diarySelect)
    .eq("id", entryId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const entry = data as unknown as DiaryEntryWithRelations;
  if (entry.visibility !== "public" && entry.user_id !== viewerId) {
    return null;
  }

  return withRelations(entry);
};

type ListDiaryParams = {
  scope: "me" | "public";
  userId?: string;
  limit?: number;
};

export const listDiaryEntries = async (
  supabase: Supabase,
  params: ListDiaryParams
) => {
  const limit = params.limit ?? 20;
  let query = supabase
    .from("emotion_diary_entries")
    .select(diarySelect)
    .is("deleted_at", null)
    .limit(limit);

  if (params.scope === "me") {
    if (!params.userId) {
      throw new Error("userId is required for scope=me");
    }
    query = query
      .eq("user_id", params.userId)
      .order("journal_date", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query
      .eq("visibility", "public")
      .order("published_at", { ascending: false, nullsFirst: false });
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((entry) => withRelations(entry as unknown as DiaryEntryWithRelations));
};

export const deleteDiaryEntry = async (supabase: Supabase, entryId: string, userId: string) => {
  const { error } = await supabase
    .from("emotion_diary_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
};
