import type { SupabaseClient } from "@supabase/supabase-js";
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

export type MindTreeState = Database["public"]["Tables"]["mind_trees"]["Row"] & {
  emotions: Database["public"]["Tables"]["mind_tree_emotions"]["Row"][];
};

const supabaseAdmin = getSupabaseAdminClient();

const pickVariant = (seed: string, salt: string, max: number) => {
  const input = `${seed}:${salt}`;
  const hash = [...input].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % max;
};

const ensureMindTree = async (userId: string, client: SupabaseClient<Database>) => {
  const { data } = await client
    .from("mind_trees")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) {
    return data;
  }

  const baseColorIndex = pickVariant(userId, "primary", 12);
  const secondaryIndex = (baseColorIndex + 5) % 12;

  const { data: inserted, error } = await client
    .from("mind_trees")
    .insert({
      user_id: userId,
      primary_color: `var(--tape-palette-${baseColorIndex})`,
      secondary_color: `var(--tape-palette-${secondaryIndex})`,
      shape_variant: pickVariant(userId, "shape", 12),
      leaf_variant: pickVariant(userId, "leaf", 8),
      background_variant: pickVariant(userId, "background", 16)
    })
    .select("*")
    .single();

  if (error || !inserted) {
    throw error ?? new Error("Failed to initialize mind tree");
  }

  return inserted;
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

  const { data, error } = await supabaseAdmin
    .from("mind_trees")
    .update({
      growth_points: newPoints,
      stage: newStage,
      emotion_diversity_score: Math.min(1000, tree.emotion_diversity_score + (entry.emotion_key ? 5 : 0)),
      last_event_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .select("*")
    .single();

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

  return data;
};
