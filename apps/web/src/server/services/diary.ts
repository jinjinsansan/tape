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
  emotion_label?: string | null;
  event_summary?: string | null;
  realization?: string | null;
  self_esteem_score?: number | null;
  worthlessness_score?: number | null;
  visibility?: DiaryVisibility;
  journal_date?: string;
  published_at?: string | null;
  ai_comment_status?: DiaryAiCommentStatus;
  is_ai_comment_public?: boolean;
  is_counselor_comment_public?: boolean;
};

export type DiaryEntryUpdateInput = Partial<Omit<DiaryEntryInput, 'content'>> & {
  content?: string;
};

export type DiaryEntryWithRelations = Database["public"]["Tables"]["emotion_diary_entries"]["Row"] & {
  feelings: Database["public"]["Tables"]["emotion_diary_entry_feelings"]["Row"][];
  reactions: Database["public"]["Tables"]["emotion_diary_reactions"]["Row"][];
};

export type DiaryEntryWithExtras = DiaryEntryWithRelations & {
  hasCounselorComment?: boolean;
};

export type DiaryInitialScore = Database["public"]["Tables"]["diary_initial_scores"]["Row"];

export type PreviousWorthlessnessScore = {
  source: "initial" | "entry";
  date: string;
  worthlessness_score: number;
  self_esteem_score: number | null;
  entry_id?: string;
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
  emotion_label,
  event_summary,
  realization,
  self_esteem_score,
  worthlessness_score,
  visibility,
  ai_comment_status,
  ai_comment,
  ai_comment_generated_at,
  ai_comment_metadata,
  ai_summary,
  ai_highlights,
  is_ai_comment_public,
  is_counselor_comment_public,
  published_at,
  journal_date,
  created_at,
  updated_at,
  deleted_at,
  counselor_memo,
  counselor_name,
  is_visible_to_user,
  counselor_memo_read,
  assigned_counselor,
  urgency_level,
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
      emotion_label: payload.emotion_label ?? null,
      event_summary: payload.event_summary ?? null,
      realization: payload.realization ?? null,
      self_esteem_score: payload.self_esteem_score ?? null,
      worthlessness_score: payload.worthlessness_score ?? null,
      visibility: payload.visibility ?? "private",
      journal_date: payload.journal_date ?? undefined,
      published_at: payload.published_at ?? null,
      ai_comment_status: payload.ai_comment_status ?? "idle",
      is_ai_comment_public: payload.is_ai_comment_public ?? false,
      is_counselor_comment_public: payload.is_counselor_comment_public ?? false
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
  payload: DiaryEntryUpdateInput,
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
      emotion_label: payload.emotion_label ?? undefined,
      event_summary: payload.event_summary ?? undefined,
      realization: payload.realization ?? undefined,
      self_esteem_score: payload.self_esteem_score ?? undefined,
      worthlessness_score: payload.worthlessness_score ?? undefined,
      visibility: payload.visibility ?? undefined,
      journal_date: payload.journal_date ?? undefined,
      published_at: payload.published_at ?? undefined,
      ai_comment_status: payload.ai_comment_status ?? undefined,
      is_ai_comment_public: payload.is_ai_comment_public ?? undefined,
      is_counselor_comment_public: payload.is_counselor_comment_public ?? undefined
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

type DiaryHistoryFilters = {
  userId: string;
  startDate?: string;
  endDate?: string;
  emotion?: string;
  keyword?: string;
  limit?: number;
  page?: number;
};

export const searchDiaryEntries = async (
  supabase: Supabase,
  filters: DiaryHistoryFilters
) => {
  const limit = filters.limit ?? 20;
  const page = filters.page ?? 0;
  const from = page * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("emotion_diary_entries")
    .select(diarySelect, { count: "exact" })
    .eq("user_id", filters.userId)
    .is("deleted_at", null);

  if (filters.startDate) {
    query = query.gte("journal_date", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("journal_date", filters.endDate);
  }
  if (filters.emotion) {
    query = query.eq("emotion_label", filters.emotion);
  }
  if (filters.keyword) {
    const escaped = filters.keyword.replace(/%/g, "\\%").replace(/,/g, "\\,");
    const pattern = `%${escaped}%`;
    query = query.or(
      [
        `title.ilike.${pattern}`,
        `content.ilike.${pattern}`,
        `event_summary.ilike.${pattern}`,
        `realization.ilike.${pattern}`
      ].join(",")
    );
  }

  const { data, error, count } = await query
    .order("journal_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  let entries: DiaryEntryWithExtras[] = (data ?? []).map(
    (entry) => withRelations(entry as unknown as DiaryEntryWithRelations)
  );

  const entryIds = entries.map((entry) => entry.id);
  if (entryIds.length > 0) {
    const { data: commentRows, error: commentError } = await supabase
      .from("emotion_diary_comments")
      .select("entry_id")
      .in("entry_id", entryIds)
      .eq("source", "counselor");

    if (commentError) {
      throw commentError;
    }

    const commentedIds = new Set((commentRows ?? []).map((row) => row.entry_id));
    entries = entries.map((entry) => ({
      ...entry,
      hasCounselorComment: commentedIds.has(entry.id)
    }));
  } else {
    entries = entries.map((entry) => ({ ...entry, hasCounselorComment: false }));
  }

  return { entries, count: count ?? entries.length };
};

export const getInitialScore = async (supabase: Supabase, userId: string) => {
  const { data, error } = await supabase
    .from("diary_initial_scores")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
};

export const upsertInitialScore = async (
  supabase: Supabase,
  userId: string,
  payload: { self_esteem_score: number; worthlessness_score: number; measured_on: string }
) => {
  const { data, error } = await supabase
    .from("diary_initial_scores")
    .upsert(
      {
        user_id: userId,
        self_esteem_score: payload.self_esteem_score,
        worthlessness_score: payload.worthlessness_score,
        measured_on: payload.measured_on
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const getPreviousWorthlessnessScore = async (
  supabase: Supabase,
  userId: string,
  options: { initialScore?: DiaryInitialScore | null } = {}
): Promise<PreviousWorthlessnessScore | null> => {
  const { initialScore } = options;

  const { data: latestEntry, error } = await supabase
    .from("emotion_diary_entries")
    .select("id,journal_date,created_at,worthlessness_score,self_esteem_score")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .not("worthlessness_score", "is", null)
    .order("journal_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (latestEntry && latestEntry.worthlessness_score != null) {
    return {
      source: "entry",
      date: latestEntry.journal_date,
      worthlessness_score: latestEntry.worthlessness_score,
      self_esteem_score: latestEntry.self_esteem_score ?? null,
      entry_id: latestEntry.id
    };
  }

  const base = initialScore ?? (await getInitialScore(supabase, userId));
  if (base) {
    return {
      source: "initial",
      date: base.measured_on,
      worthlessness_score: base.worthlessness_score,
      self_esteem_score: base.self_esteem_score
    };
  }

  return null;
};

export const listEntriesForTrend = async (supabase: Supabase, userId: string) => {
  const { data, error } = await supabase
    .from("emotion_diary_entries")
    .select(
      `id, journal_date, self_esteem_score, worthlessness_score, emotion_label, created_at`
    )
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("journal_date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(5000);

  if (error) {
    throw error;
  }

  return data ?? [];
};
