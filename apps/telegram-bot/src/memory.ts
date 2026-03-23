/** User memory system — long-term per-user memories stored in Supabase */

import { supabase } from "./supabase.js";

export type MemoryCategory =
  | "profile"
  | "emotion_pattern"
  | "duct_tape"
  | "insight"
  | "context";

export type Memory = {
  id: string;
  category: MemoryCategory;
  content: string;
  importance: number;
  created_at: string;
};

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  profile: "プロフィール",
  emotion_pattern: "感情パターン",
  duct_tape: "ガムテープ（思い込み）",
  insight: "気づき・成長",
  context: "状況・背景",
};

// ── Memory recall trigger keywords ──────────────────────

const RECALL_KEYWORDS = [
  "覚えてる",
  "覚えている",
  "覚えてますか",
  "前に話した",
  "前に言った",
  "以前話した",
  "前回",
  "この前",
  "あの時",
  "言ってた",
  "言っていた",
  "話したこと",
  "知ってる",
  "知ってますか",
];

export function shouldTriggerFullRecall(userMessage: string): boolean {
  const text = userMessage.toLowerCase();
  return RECALL_KEYWORDS.some((kw) => text.includes(kw));
}

// ── CRUD ────────────────────────────────────────────────

export async function saveMemory(
  sessionId: string,
  category: MemoryCategory,
  content: string,
  importance: number,
): Promise<void> {
  const clamped = Math.max(1, Math.min(10, Math.round(importance)));
  const { error } = await supabase.from("telegram_bot_user_memories").insert({
    session_id: sessionId,
    category,
    content,
    importance: clamped,
  });
  if (error) console.error("Failed to save memory:", error.message);
}

/** Load recent N memories — called every turn (low cost) */
export async function loadRecentMemories(
  sessionId: string,
  limit = 10,
): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("telegram_bot_user_memories")
    .select("id, category, content, importance, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load recent memories:", error.message);
    return [];
  }
  return (data ?? []) as Memory[];
}

/** Load ALL memories — only called on recall trigger */
export async function loadAllMemories(sessionId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("telegram_bot_user_memories")
    .select("id, category, content, importance, created_at")
    .eq("session_id", sessionId)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load all memories:", error.message);
    return [];
  }
  return (data ?? []) as Memory[];
}

// ── Formatting ──────────────────────────────────────────

export function formatMemoryContext(
  memories: Memory[],
  mode: "recent" | "full",
): string {
  if (!memories.length) return "";

  if (mode === "recent") {
    const lines = memories.map(
      (m) => `- [${CATEGORY_LABELS[m.category]}] ${m.content}`,
    );
    return (
      `\n\n【ユーザーについての記憶（直近）】\n` +
      `以下はこのユーザーについて覚えている情報です。自然に活かしてください。\n` +
      lines.join("\n")
    );
  }

  // Full mode: organized by category
  const grouped = new Map<MemoryCategory, Memory[]>();
  for (const m of memories) {
    const list = grouped.get(m.category) ?? [];
    list.push(m);
    grouped.set(m.category, list);
  }

  let result = `\n\n【ユーザーについての記憶（全件）】\n`;
  result += `ユーザーが過去の記憶について聞いています。以下の全ての記憶を参考にして答えてください。\n`;

  for (const [category, items] of grouped) {
    result += `\n## ${CATEGORY_LABELS[category]}\n`;
    for (const m of items) {
      result += `- ${m.content}\n`;
    }
  }

  return result;
}
