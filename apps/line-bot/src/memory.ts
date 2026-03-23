/** User memory system — deep understanding per-user memories stored in Supabase */

import type OpenAI from "openai";
import { supabase } from "./supabase.js";

// ── Types ───────────────────────────────────────────────

export type MemoryCategory =
  | "profile"
  | "emotion_pattern"
  | "duct_tape"
  | "insight"
  | "context"
  | "person"
  | "episode";

export type PersonMetadata = {
  name: string;
  relationship: string;
  sentiment?: string;
};

export type EpisodeMetadata = {
  involved_persons?: string[];
  date?: string;
  resolved?: boolean;
};

export type MemoryMetadata = PersonMetadata | EpisodeMetadata | null;

export type Memory = {
  id: string;
  category: MemoryCategory;
  content: string;
  importance: number;
  created_at: string;
  metadata?: MemoryMetadata;
};

export type UserSummary = {
  summary: string;
  person_map: string;
  message_count_at_generation: number;
};

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  profile: "プロフィール",
  emotion_pattern: "感情パターン",
  duct_tape: "ガムテープ（思い込み）",
  insight: "気づき・成長",
  context: "状況・背景",
  person: "人物",
  episode: "出来事",
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
  metadata?: MemoryMetadata,
): Promise<void> {
  const clamped = Math.max(1, Math.min(10, Math.round(importance)));

  // person カテゴリは同一人物なら追記マージ
  if (category === "person" && metadata && "name" in metadata) {
    const existing = await findPersonMemory(sessionId, metadata.name);
    if (existing) {
      const updatedContent = existing.content + "\n" + content;
      await supabase
        .from("telegram_bot_user_memories")
        .update({ content: updatedContent, metadata, importance: clamped })
        .eq("id", existing.id);
      return;
    }
  }

  const { error } = await supabase.from("telegram_bot_user_memories").insert({
    session_id: sessionId,
    category,
    content,
    importance: clamped,
    metadata: metadata ?? null,
  });
  if (error) console.error("Failed to save memory:", error.message);
}

async function findPersonMemory(
  sessionId: string,
  personName: string,
): Promise<Memory | null> {
  const { data } = await supabase
    .from("telegram_bot_user_memories")
    .select("id, category, content, importance, created_at, metadata")
    .eq("session_id", sessionId)
    .eq("category", "person")
    .not("metadata", "is", null);

  if (!data) return null;
  return (
    (data as Memory[]).find((m) => {
      const meta = m.metadata as PersonMetadata | null;
      return meta?.name === personName;
    }) ?? null
  );
}

// ── Load functions ──────────────────────────────────────

/** Load recent N memories (non-person, non-episode) */
export async function loadRecentMemories(
  sessionId: string,
  limit = 8,
): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("telegram_bot_user_memories")
    .select("id, category, content, importance, created_at, metadata")
    .eq("session_id", sessionId)
    .not("category", "in", '("person","episode")')
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load recent memories:", error.message);
    return [];
  }
  return (data ?? []) as Memory[];
}

/** Load ALL memories */
export async function loadAllMemories(sessionId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("telegram_bot_user_memories")
    .select("id, category, content, importance, created_at, metadata")
    .eq("session_id", sessionId)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load all memories:", error.message);
    return [];
  }
  return (data ?? []) as Memory[];
}

/** Load all person memories (the "person map") */
export async function loadPersonMap(sessionId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("telegram_bot_user_memories")
    .select("id, category, content, importance, created_at, metadata")
    .eq("session_id", sessionId)
    .eq("category", "person")
    .order("importance", { ascending: false });

  if (error) {
    console.error("Failed to load person map:", error.message);
    return [];
  }
  return (data ?? []) as Memory[];
}

/** Load episodes related to specific person names */
export async function loadRelatedEpisodes(
  sessionId: string,
  personNames: string[],
): Promise<Memory[]> {
  // Load all episodes and filter by involved_persons
  const { data, error } = await supabase
    .from("telegram_bot_user_memories")
    .select("id, category, content, importance, created_at, metadata")
    .eq("session_id", sessionId)
    .eq("category", "episode")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Failed to load episodes:", error.message);
    return [];
  }

  // Filter episodes that involve any of the mentioned persons
  return ((data ?? []) as Memory[]).filter((m) => {
    const meta = m.metadata as EpisodeMetadata | null;
    if (!meta?.involved_persons) return false;
    return personNames.some((name) => meta.involved_persons!.includes(name));
  }).slice(0, 5);
}

// ── User Summary ────────────────────────────────────────

export async function loadUserSummary(
  sessionId: string,
): Promise<UserSummary | null> {
  const { data, error } = await supabase
    .from("telegram_bot_user_summaries")
    .select("summary, person_map, message_count_at_generation")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load user summary:", error.message);
    return null;
  }
  return data as UserSummary | null;
}

export async function saveUserSummary(
  sessionId: string,
  summary: string,
  personMap: string,
  messageCount: number,
): Promise<void> {
  const { error } = await supabase
    .from("telegram_bot_user_summaries")
    .upsert(
      {
        session_id: sessionId,
        summary,
        person_map: personMap,
        message_count_at_generation: messageCount,
      },
      { onConflict: "session_id" },
    );
  if (error) console.error("Failed to save user summary:", error.message);
}

/** Regenerate user understanding summary (async, non-blocking) */
export async function maybeRegenerateSummary(
  sessionId: string,
  currentMessageCount: number,
  openai: OpenAI,
): Promise<void> {
  const existing = await loadUserSummary(sessionId);
  const lastGen = existing?.message_count_at_generation ?? 0;

  if (currentMessageCount < 5 || currentMessageCount - lastGen < 10) return;

  const allMemories = await loadAllMemories(sessionId);
  if (allMemories.length === 0) return;

  const personMemories = allMemories.filter((m) => m.category === "person");
  const otherMemories = allMemories.filter((m) => m.category !== "person");

  const memoryDump = otherMemories
    .map((m) => `[${CATEGORY_LABELS[m.category]}] ${m.content}`)
    .join("\n");

  const personDump = personMemories
    .map((m) => {
      const meta = m.metadata as PersonMetadata | null;
      return meta
        ? `${meta.name}（${meta.relationship}）: ${m.content}`
        : m.content;
    })
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `以下のメモリデータから、このユーザーの理解サマリーを生成してください。
2つの出力を生成：
1. SUMMARY: この人がどんな人で、どんな悩みを抱え、どんな成長をしているか（200字以内）
2. PERSON_MAP: ユーザーの人生に登場する人物の簡潔な一覧（各人物50字以内）

フォーマット:
SUMMARY:
（サマリー）

PERSON_MAP:
（人物MAP）`,
      },
      {
        role: "user",
        content: `記憶データ:\n${memoryDump}\n\n人物データ:\n${personDump || "（なし）"}`,
      },
    ],
    max_tokens: 500,
    temperature: 0.3,
  });

  const output = completion.choices[0]?.message?.content ?? "";
  const summaryMatch = output.match(/SUMMARY:\n([\s\S]*?)(?=PERSON_MAP:|$)/);
  const personMapMatch = output.match(/PERSON_MAP:\n([\s\S]*?)$/);

  await saveUserSummary(
    sessionId,
    summaryMatch?.[1]?.trim() ?? "",
    personMapMatch?.[1]?.trim() ?? "",
    currentMessageCount,
  );

  console.log(`[Memory] Summary regenerated for session ${sessionId.substring(0, 8)}...`);
}

// ── Person detection ────────────────────────────────────

/** Detect if the user message mentions any known person */
export function detectMentionedPersons(
  message: string,
  personMap: Memory[],
): string[] {
  const mentioned: string[] = [];
  for (const p of personMap) {
    const meta = p.metadata as PersonMetadata | null;
    if (!meta) continue;
    if (message.includes(meta.name) || message.includes(meta.relationship)) {
      mentioned.push(meta.name);
    }
  }
  return mentioned;
}

// ── Formatting ──────────────────────────────────────────

export function formatDeepMemoryContext(
  recentMemories: Memory[],
  personMap: Memory[],
  relevantEpisodes: Memory[],
  userSummary: UserSummary | null,
  fullRecall: boolean,
): string {
  let result = "";

  // 1. ユーザー理解サマリー（常時）
  if (userSummary?.summary) {
    result += `\n\n【このユーザーについて】\n${userSummary.summary}`;
  }

  // 2. 人物MAP（常時）
  if (personMap.length > 0) {
    result += `\n\n【人物MAP — ユーザーの人生の登場人物】`;
    for (const p of personMap) {
      const meta = p.metadata as PersonMetadata | null;
      const label = meta
        ? `${meta.name}（${meta.relationship}）`
        : "不明";
      result += `\n- ${label}: ${p.content}`;
    }
  }

  // 3. 関連エピソード（人物名が出た時のみ）
  if (relevantEpisodes.length > 0) {
    result += `\n\n【関連する過去の出来事】\n以下は今話題に上がっている人物に関する過去の出来事です。自然に言及してください。`;
    for (const ep of relevantEpisodes) {
      const meta = ep.metadata as EpisodeMetadata | null;
      const dateStr = meta?.date ? `[${meta.date}]` : "";
      result += `\n- ${dateStr} ${ep.content}`;
    }
  }

  // 4. その他の記憶
  const nonPersonEpisode = recentMemories.filter(
    (m) => m.category !== "person" && m.category !== "episode",
  );

  if (fullRecall) {
    // 全件モード
    const grouped = new Map<MemoryCategory, Memory[]>();
    for (const m of recentMemories) {
      const list = grouped.get(m.category) ?? [];
      list.push(m);
      grouped.set(m.category, list);
    }
    result += `\n\n【全ての記憶】`;
    for (const [category, items] of grouped) {
      if (category === "person") continue; // 既に表示済み
      result += `\n## ${CATEGORY_LABELS[category]}`;
      for (const m of items) {
        result += `\n- ${m.content}`;
      }
    }
  } else if (nonPersonEpisode.length > 0) {
    result += `\n\n【最近の記憶】`;
    for (const m of nonPersonEpisode) {
      result += `\n- [${CATEGORY_LABELS[m.category]}] ${m.content}`;
    }
  }

  return result;
}
