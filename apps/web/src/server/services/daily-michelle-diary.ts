import { randomInt } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { Json } from "@tape/supabase";

import { getMichelleDailyDiaryUserId } from "@/lib/env";
import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";
import { getMichelleOpenAIClient } from "@/lib/michelle/openai";
import { getSupabaseAdminClient } from "@/server/supabase";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "apps/web/md/michelle");
const DAILY_SETTING_KEY = "michelle_daily_diary_state";
const DAILY_MODEL = process.env.MICHELLE_DAILY_DIARY_MODEL || "gpt-4o-mini";
const POST_HOUR_JST = 8;
const MAX_GENERATION_ATTEMPTS = 3;

type DailyState = {
  last_index?: number;
  last_file?: string;
  last_journal_date?: string;
  entry_id?: string;
};

type JstContext = {
  dateString: string;
  isoNow: string;
  hour: number;
  minute: number;
};

type KnowledgeSelection = {
  relativePath: string;
  content: string;
  category: string;
  title: string;
  index: number;
  total: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  "01_gairon": "概論",
  "01_rinen_tetsugaku": "理念・哲学",
  "02a_gumtape_kiso": "ガムテープ基礎",
  "02b_watashi_kouzo": "私の構造",
  "02c_bouei_kikou": "防衛・対処",
  "02d_trauma_katei": "トラウマ",
  "02e_izon_kankei": "依存・人間関係",
  "02f_shiko_shoujou": "思考・症状",
  "03_jissen_technique": "実践テクニック",
  "04_counselor_kokoroe": "カウンセラー心得",
  "05_kaihou_technique": "解放テクニック"
};

let cachedKnowledgeFiles: Promise<string[]> | null = null;

const collectKnowledgeFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectKnowledgeFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README_filename_mapping.md") {
      files.push(fullPath);
    }
  }

  return files;
};

const getKnowledgeFiles = () => {
  if (!cachedKnowledgeFiles) {
    cachedKnowledgeFiles = collectKnowledgeFiles(KNOWLEDGE_ROOT).then((files) => files.sort());
  }
  return cachedKnowledgeFiles;
};

const getJstContext = (date = new Date()): JstContext => {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  const parts = formatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";

  const year = part("year");
  const month = part("month");
  const day = part("day");
  const hour = Number(part("hour"));
  const minute = Number(part("minute"));

  return {
    dateString: `${year}-${month}-${day}`,
    isoNow: date.toISOString(),
    hour,
    minute
  };
};

const extractTitle = (content: string) => {
  const match = content.match(/^#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : null;
};

const slugToTitle = (relativePath: string) => {
  const base = path.basename(relativePath, path.extname(relativePath));
  return base
    .split(/[\-_]+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

const selectKnowledge = async (): Promise<KnowledgeSelection> => {
  const files = await getKnowledgeFiles();
  if (!files.length) {
    throw new Error("No Michelle knowledge files found");
  }

  const client = getSupabaseAdminClient();
  const { data } = await client
    .from("admin_settings")
    .select("value")
    .eq("key", DAILY_SETTING_KEY)
    .maybeSingle<{ value: DailyState | null }>();

  const state = (data?.value ?? null) as DailyState | null;
  let nextIndex: number;
  if (typeof state?.last_index === "number") {
    nextIndex = (state.last_index + 1) % files.length;
  } else {
    nextIndex = randomInt(files.length);
  }

  const absolutePath = files[nextIndex];
  const relativePath = path.relative(KNOWLEDGE_ROOT, absolutePath);
  const content = await readFile(absolutePath, "utf-8");
  const categorySlug = relativePath.split(path.sep)[0] ?? "";
  const title = extractTitle(content) ?? slugToTitle(relativePath);

  return {
    relativePath,
    content,
    category: CATEGORY_LABELS[categorySlug] ?? categorySlug,
    title,
    index: nextIndex,
    total: files.length
  };
};

const sanitizeLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[\d\-•*]+[).\s]*/u, ""));

const generateDiaryBody = async (selection: KnowledgeSelection) => {
  const openai = getMichelleOpenAIClient();
  const systemPrompt = `あなたはテープ式心理学の専門AI「ミシェル」です。以下の資料から、みんなの日記に投稿する朝のショートメッセージを作成してください。必ず次を守ってください。
- 3行ちょうど
- 各行40文字以内の自然な日本語
- 資料に含まれる知識のみを要約し、実践ヒントを示す
- あいさつ・箇条書き記号・番号・絵文字は禁止`;

  const baseUserPrompt = `資料タイトル: ${selection.title}
カテゴリ: ${selection.category}
---
${selection.content}
---
出力フォーマット:
行1
行2
行3`;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const completion = await openai.chat.completions.create({
      model: DAILY_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: baseUserPrompt }
      ]
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      continue;
    }

    const lines = sanitizeLines(text);
    if (lines.length < 3) {
      continue;
    }

    const trimmed = lines.slice(0, 3).map((line) => (line.length > 42 ? `${line.slice(0, 40).trim()}…` : line));
    if (trimmed.length === 3) {
      return trimmed.join("\n");
    }
  }

  throw new Error("Failed to generate daily diary content");
};

const saveState = async (state: DailyState) => {
  const client = getSupabaseAdminClient();
  await client.from("admin_settings").upsert({
    key: DAILY_SETTING_KEY,
    value: state as Json,
    updated_at: new Date().toISOString()
  });
};

export type DailyDiaryResult =
  | { posted: true; entryId: string; journalDate: string }
  | { posted: false; reason: string; journalDate: string };

type PostOptions = {
  force?: boolean;
  now?: Date;
};

export const postDailyMichelleDiaryEntry = async (options: PostOptions = {}): Promise<DailyDiaryResult> => {
  if (!MICHELLE_AI_ENABLED) {
    return { posted: false, reason: "michelle_disabled", journalDate: new Date().toISOString().slice(0, 10) };
  }

  const userId = getMichelleDailyDiaryUserId();
  const client = getSupabaseAdminClient();
  const now = options.now ?? new Date();
  const jst = getJstContext(now);

  if (!options.force) {
    if (jst.hour < POST_HOUR_JST) {
      return { posted: false, reason: "before_schedule", journalDate: jst.dateString };
    }
  }

  const { data: existing } = await client
    .from("emotion_diary_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("journal_date", jst.dateString)
    .is("deleted_at", null)
    .maybeSingle<{ id: string }>();

  if (existing) {
    return { posted: false, reason: "already_posted", journalDate: jst.dateString };
  }

  const selection = await selectKnowledge();
  const body = await generateDiaryBody(selection);
  const title = `ミシェルAIの朝のひとこと：${selection.title}`;

  const { data, error } = await client
    .from("emotion_diary_entries")
    .insert({
      user_id: userId,
      title,
      content: body,
      visibility: "public",
      published_at: jst.isoNow,
      journal_date: jst.dateString,
      is_shareable: false,
      ai_comment_status: "skipped",
      ai_comment_metadata: {
        source: "michelle_daily_diary",
        chunk_path: selection.relativePath,
        chunk_index: selection.index,
        total_chunks: selection.total
      } satisfies Json,
      is_ai_comment_public: false,
      is_counselor_comment_public: false
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw error ?? new Error("Failed to insert daily diary entry");
  }

  await saveState({
    last_index: selection.index,
    last_file: selection.relativePath,
    last_journal_date: jst.dateString,
    entry_id: data.id
  });

  return { posted: true, entryId: data.id, journalDate: jst.dateString };
};
