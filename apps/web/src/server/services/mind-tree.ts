import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tape/supabase";

import { getSupabaseAdminClient } from "@/server/supabase";

const STAGE_THRESHOLDS = [0, 50, 150, 400, 800, 1500] as const;
const STAGES: Database["public"]["Enums"]["mind_tree_stage"][] = [
  "seed",
  "sprout",
  "sapling",
  "blooming",
  "fruit_bearing",
  "guardian"
];

const MIND_TREE_COLUMNS_BASE = [
  "user_id",
  "stage",
  "growth_points",
  "primary_color",
  "secondary_color",
  "shape_variant",
  "leaf_variant",
  "background_variant",
  "weather_state",
  "emotion_diversity_score",
  "last_event_at",
  "created_at",
  "updated_at"
].join(",");
const MIND_TREE_COLUMNS_FULL = `${MIND_TREE_COLUMNS_BASE},color_cycle_index`;

let colorCycleSupported = true;
let colorCycleWarningLogged = false;

export type MindTreeState = Database["public"]["Tables"]["mind_trees"]["Row"] & {
  emotions: Database["public"]["Tables"]["mind_tree_emotions"]["Row"][];
};

const supabaseAdmin = getSupabaseAdminClient();

const isColorCycleSchemaError = (error: unknown): error is PostgrestError => {
  if (!error || typeof error !== "object") {
    return false;
  }
  const pgError = error as PostgrestError;
  return (
    pgError.code === "PGRST204" &&
    typeof pgError.message === "string" &&
    pgError.message.includes("color_cycle_index")
  );
};

const handleColorCycleSchemaError = (error: unknown) => {
  if (!isColorCycleSchemaError(error)) {
    return false;
  }
  if (colorCycleSupported) {
    colorCycleSupported = false;
    if (!colorCycleWarningLogged) {
      console.warn("Mind tree color cycle column unavailable. Falling back to legacy mode.");
      colorCycleWarningLogged = true;
    }
  }
  return true;
};

const normalizeMindTreeRow = (
  row: Partial<Database["public"]["Tables"]["mind_trees"]["Row"]>
): Database["public"]["Tables"]["mind_trees"]["Row"] => {
  const colorCycle = typeof row.color_cycle_index === "number" ? row.color_cycle_index : 0;
  return {
    ...row,
    color_cycle_index: colorCycle
  } as Database["public"]["Tables"]["mind_trees"]["Row"];
};

const selectMindTreeRecord = async (
  client: SupabaseClient<Database>,
  userId: string
) => {
  let query = client
    .from("mind_trees")
    .select(colorCycleSupported ? MIND_TREE_COLUMNS_FULL : MIND_TREE_COLUMNS_BASE)
    .eq("user_id", userId)
    .maybeSingle();

  let { data, error } = await query;

  if (error && handleColorCycleSchemaError(error)) {
    ({ data, error } = await client
      .from("mind_trees")
      .select(MIND_TREE_COLUMNS_BASE)
      .eq("user_id", userId)
      .maybeSingle());
  }

  if (error) {
    throw error;
  }

  return data ? normalizeMindTreeRow(data) : null;
};

const pickVariant = (seed: string, salt: string, max: number) => {
  const input = `${seed}:${salt}`;
  const hash = [...input].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % max;
};

const ensureMindTree = async (userId: string, client: SupabaseClient<Database>) => {
  const existing = await selectMindTreeRecord(client, userId);
  if (existing) {
    return existing;
  }

  const baseColorIndex = pickVariant(userId, "primary", 12);
  const secondaryIndex = (baseColorIndex + 5) % 12;

  const buildInsertPayload = (includeColorCycle: boolean) => ({
    user_id: userId,
    primary_color: `var(--tape-palette-${baseColorIndex})`,
    secondary_color: `var(--tape-palette-${secondaryIndex})`,
    shape_variant: pickVariant(userId, "shape", 12),
    leaf_variant: pickVariant(userId, "leaf", 8),
    background_variant: pickVariant(userId, "background", 16),
    ...(includeColorCycle ? { color_cycle_index: 0 } : {})
  });

  let { data: inserted, error } = await client
    .from("mind_trees")
    .insert(buildInsertPayload(colorCycleSupported))
    .select(colorCycleSupported ? MIND_TREE_COLUMNS_FULL : MIND_TREE_COLUMNS_BASE)
    .single();

  if (error && handleColorCycleSchemaError(error)) {
    ({ data: inserted, error } = await client
      .from("mind_trees")
      .insert(buildInsertPayload(false))
      .select(MIND_TREE_COLUMNS_BASE)
      .single());
  }

  if (error || !inserted) {
    throw error ?? new Error("Failed to initialize mind tree");
  }

  return normalizeMindTreeRow(inserted);
};

export const getMindTree = async (userId: string): Promise<MindTreeState> => {
  const tree = await ensureMindTree(userId, supabaseAdmin);
  const { data: emotions } = await supabaseAdmin
    .from("mind_tree_emotions")
    .select("*")
    .eq("user_id", userId)
    .order("entry_count", { ascending: false });

  return {
    ...tree,
    emotions: emotions ?? []
  };
};

type EntryData = {
  emotion_key?: string | null;
  emotion_intensity?: number | null;
  self_esteem_delta?: number | null;
  is_ai_assisted?: boolean;
};

const calculateGrowthPoints = (entry: EntryData) => {
  let points = 5; // base for writing
  if (entry.emotion_key) points += 3;
  if (entry.emotion_intensity) points += Math.min(5, Math.max(0, Math.round(entry.emotion_intensity / 20)));
  if (entry.self_esteem_delta && entry.self_esteem_delta > 0) points += 5;
  if (entry.is_ai_assisted) points += 2;
  return points;
};

const determineStage = (points: number) => {
  let stageIndex = 0;
  for (let i = STAGE_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (points >= STAGE_THRESHOLDS[i]) {
      stageIndex = i;
      break;
    }
  }
  return STAGES[stageIndex] ?? "seed";
};

const updateEmotionStats = async (userId: string, entry: EntryData) => {
  if (!entry.emotion_key) return;

  const { data: existing } = await supabaseAdmin
    .from("mind_tree_emotions")
    .select("entry_count, total_intensity")
    .eq("user_id", userId)
    .eq("emotion_key", entry.emotion_key)
    .maybeSingle();

  const payload = {
    user_id: userId,
    emotion_key: entry.emotion_key,
    entry_count: (existing?.entry_count ?? 0) + 1,
    total_intensity: (existing?.total_intensity ?? 0) + (entry.emotion_intensity ?? 0),
    last_entry_at: new Date().toISOString()
  } satisfies Database["public"]["Tables"]["mind_tree_emotions"]["Insert"];

  const { error } = await supabaseAdmin
    .from("mind_tree_emotions")
    .upsert(payload);

  if (error) {
    console.error("Failed to upsert mind_tree_emotions", error);
  }
};

export const updateMindTree = async (userId: string, entry: EntryData) => {
  const tree = await ensureMindTree(userId, supabaseAdmin);
  const growthGain = calculateGrowthPoints(entry);
  const newPoints = tree.growth_points + growthGain;
  const newStage = determineStage(newPoints);
  const nextColorCycle = (tree.color_cycle_index ?? 0) + 1;

  const buildUpdatePayload = (includeColorCycle: boolean) => ({
    growth_points: newPoints,
    stage: newStage,
    emotion_diversity_score: Math.min(
      1000,
      tree.emotion_diversity_score + (entry.emotion_key ? 5 : 0)
    ),
    last_event_at: new Date().toISOString(),
    ...(includeColorCycle ? { color_cycle_index: nextColorCycle } : {})
  });

  let { data, error } = await supabaseAdmin
    .from("mind_trees")
    .update(buildUpdatePayload(colorCycleSupported))
    .eq("user_id", userId)
    .select(colorCycleSupported ? MIND_TREE_COLUMNS_FULL : MIND_TREE_COLUMNS_BASE)
    .single();

  if (error && handleColorCycleSchemaError(error)) {
    ({ data, error } = await supabaseAdmin
      .from("mind_trees")
      .update(buildUpdatePayload(false))
      .eq("user_id", userId)
      .select(MIND_TREE_COLUMNS_BASE)
      .single());
  }

  if (error || !data) {
    throw error ?? new Error("Failed to update mind tree");
  }

  await updateEmotionStats(userId, entry);

  const stageChanged = tree.stage !== data.stage;
  if (stageChanged) {
    await supabaseAdmin.from("mind_tree_events").insert({
      user_id: userId,
      event_type: "growth_stage_up",
      payload: {
        from: tree.stage,
        to: data.stage,
        points: newPoints
      }
    });
  }

  return normalizeMindTreeRow(data);
};
