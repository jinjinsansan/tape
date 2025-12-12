import type OpenAI from "openai";

import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";
import { getMichelleAssistantId } from "@/lib/env";
import { getMichelleOpenAIClient } from "@/lib/michelle/openai";
import { retrieveKnowledgeMatches } from "@/lib/michelle/rag";
import { getSupabaseAdminClient } from "@/server/supabase";

const DELAY_OPTIONS = [1, 10, 60, 1440] as const;
export type DiaryAiDelayMinutes = (typeof DELAY_OPTIONS)[number];

const DEFAULT_DELAY: DiaryAiDelayMinutes = 10;
const SETTING_KEY = "diary_ai_comment_delay";
const MIN_CONTENT_LENGTH = 80;
const MIN_WORD_COUNT = 15;
const MIN_COMPACT_CHAR_LENGTH = 40;
const MAX_ATTEMPTS = 3;

type AdminSettingRow = {
  key: string;
  value: { minutes?: number } | null;
};

const ensureDelayValue = (value: unknown): DiaryAiDelayMinutes => {
  if (typeof value !== "number") {
    return DEFAULT_DELAY;
  }
  const normalized = DELAY_OPTIONS.find((option) => option === value);
  return normalized ?? DEFAULT_DELAY;
};

export const getDiaryAiDelayMinutes = async (): Promise<DiaryAiDelayMinutes> => {
  const client = getSupabaseAdminClient();
  const { data } = await client
    .from("admin_settings")
    .select("key, value")
    .eq("key", SETTING_KEY)
    .maybeSingle<AdminSettingRow>();

  const minutes = (data?.value ?? undefined)?.minutes;
  return ensureDelayValue(minutes);
};

export const updateDiaryAiDelayMinutes = async (minutes: DiaryAiDelayMinutes) => {
  const client = getSupabaseAdminClient();
  await client.from("admin_settings").upsert({
    key: SETTING_KEY,
    value: { minutes },
    updated_at: new Date().toISOString()
  });
};

type SkipResult = { skipped: true; reason: string } | { skipped: false };

const CJK_CHAR_REGEX = /[\u3000-\u303F\u3040-\u30FF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF]/;

const hasCjk = (value: string) => CJK_CHAR_REGEX.test(value);

const evaluateSkip = (content: string): SkipResult => {
  const normalized = content.replace(/\s+/g, " ").trim();
  const compact = normalized.replace(/\s/g, "");

  if (!compact.length) {
    return { skipped: true, reason: "empty" };
  }

  if (compact.length < MIN_COMPACT_CHAR_LENGTH) {
    return { skipped: true, reason: "too_short" };
  }

  const containsCjk = hasCjk(compact);
  if (!containsCjk) {
    if (normalized.length < MIN_CONTENT_LENGTH) {
      return { skipped: true, reason: "too_short" };
    }
    const wordCount = normalized.split(/\s+/).filter(Boolean).length;
    if (wordCount < MIN_WORD_COUNT && compact.length < MIN_CONTENT_LENGTH) {
      return { skipped: true, reason: "low_word_count" };
    }
  }

  const uniqueChars = new Set(compact.split(""));
  if (uniqueChars.size < 5) {
    return { skipped: true, reason: "low_variance" };
  }

  return { skipped: false };
};

export const scheduleDiaryAiCommentJob = async (params: {
  entryId: string;
  userId: string;
  content: string;
}) => {
  const client = getSupabaseAdminClient();
  const skipResult = evaluateSkip(params.content ?? "");

  if (skipResult.skipped) {
    await client
      .from("emotion_diary_entries")
      .update({
        ai_comment_status: "skipped",
        ai_comment_metadata: { reason: skipResult.reason }
      })
      .eq("id", params.entryId);
    return { scheduled: false, reason: skipResult.reason } as const;
  }

  const delay = await getDiaryAiDelayMinutes();
  const scheduledAt = new Date(Date.now() + delay * 60 * 1000).toISOString();

  const { error: insertError } = await client.from("diary_ai_comment_jobs").insert({
    entry_id: params.entryId,
    user_id: params.userId,
    status: "pending",
    scheduled_at: scheduledAt,
    metadata: { delay_minutes: delay }
  });

  if (insertError) {
    throw new Error(`Failed to enqueue AI comment job: ${insertError.message}`);
  }

  const { error: updateError } = await client
    .from("emotion_diary_entries")
    .update({ ai_comment_status: "pending" })
    .eq("id", params.entryId);

  if (updateError) {
    throw new Error(`Failed to mark diary entry pending: ${updateError.message}`);
  }

  return { scheduled: true, delayMinutes: delay } as const;
};

type DiaryEntryForJob = {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  event_summary: string | null;
  realization: string | null;
  emotion_label: string | null;
  mood_label: string | null;
  journal_date: string | null;
};

type UserProfile = {
  id: string;
  display_name: string | null;
};

type OpenAIThreads = NonNullable<NonNullable<ReturnType<typeof getMichelleOpenAIClient>["beta"]>["threads"]>;

const runThreadCompletion = async (threads: OpenAIThreads, threadId: string) => {
  const assistantId = getMichelleAssistantId();
  let fullReply = "";

  await new Promise<void>((resolve, reject) => {
    const stream = threads.runs.stream(threadId, { assistant_id: assistantId });
    stream
      .on("textDelta", (delta: { value?: string }) => {
        if (delta.value) {
          fullReply += delta.value;
        }
      })
      .on("error", (error: unknown) => reject(error))
      .on("end", () => resolve());
  });

  return fullReply.trim();
};

const buildPrompt = (entry: DiaryEntryForJob, profile: UserProfile | null, knowledgeContext: string) => {
  const nameLine = profile?.display_name ? `ユーザー名: ${profile.display_name}` : "ユーザー名: 匿名";
  const journalLine = entry.journal_date ? `記入日: ${entry.journal_date}` : "";
  const emotionLine = entry.emotion_label ? `感じている主な感情: ${entry.emotion_label}` : "";
  const moodLine = entry.mood_label ? `ムードラベル: ${entry.mood_label}` : "";
  const summaryBlock = entry.event_summary ? `出来事要約: ${entry.event_summary}` : "";
  const realizationBlock = entry.realization ? `気づき: ${entry.realization}` : "";

  const constraints = `
- 5〜10行で、優しく寄り添う口調
- ユーザーが書いた内容を要約しつつ、具体的な感情への共感と実践的な一歩を提案
- Michelle心理学の知識を引用する場合は自然な形で織り交ぜる
- 姿勢は相手を裁かず、安心感を届ける
- 絵文字は使わず丁寧な敬体で`;

  const knowledgeSection = knowledgeContext
    ? `\n内部リファレンス（ユーザーには明示しない）:\n${knowledgeContext}`
    : "";

  return `あなたはテープ式心理学の専門AIカウンセラー「ミシェル」です。以下の日記に対して、温かく具体的なコメントを作成してください。${constraints}

${nameLine}
${journalLine}
${emotionLine}
${moodLine}
${summaryBlock}
${realizationBlock}

【日記本文】
${entry.content}

${knowledgeSection}`;
};

const shouldSkipDuringRun = (content: string) => evaluateSkip(content);

export const runDiaryAiCommentJobs = async (limit = 3) => {
  if (!MICHELLE_AI_ENABLED) {
    return { processed: 0, skipped: 0, failed: 0, message: "MICHELLE AI is disabled" } as const;
  }

  const client = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const { data: jobs, error } = await client
    .from("diary_ai_comment_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error || !jobs?.length) {
    if (error) {
      console.error("Failed to load diary AI jobs", error);
    }
    return { processed: 0, skipped: 0, failed: 0 } as const;
  }

  const openai = getMichelleOpenAIClient();
  const threads = openai.beta?.threads as OpenAIThreads | undefined;
  if (!threads) {
    throw new Error("OpenAI Assistants API is unavailable");
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of jobs) {
    const baseMetadata = (job.metadata as Record<string, unknown> | null) ?? {};
    const claimTime = new Date().toISOString();
    const { data: claimed, error: claimError } = await client
      .from("diary_ai_comment_jobs")
      .update({
        status: "processing",
        started_at: claimTime,
        attempt_count: job.attempt_count + 1,
        updated_at: claimTime
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) {
      continue;
    }

    try {
      const { data: entry, error: entryError } = await client
        .from("emotion_diary_entries")
        .select(
          `id, user_id, title, content, event_summary, realization, emotion_label, mood_label, journal_date`
        )
        .eq("id", job.entry_id)
        .single<DiaryEntryForJob>();

      if (entryError || !entry) {
        throw entryError ?? new Error("Entry not found");
      }

      const skipCheck = shouldSkipDuringRun(entry.content);
      if (skipCheck.skipped) {
        skipped += 1;
        await client
          .from("diary_ai_comment_jobs")
          .update({
            status: "skipped",
            completed_at: new Date().toISOString(),
            metadata: {
              ...baseMetadata,
              skip_reason: skipCheck.reason
            }
          })
          .eq("id", job.id);

        await client
          .from("emotion_diary_entries")
          .update({
            ai_comment_status: "skipped",
            ai_comment_metadata: { reason: skipCheck.reason }
          })
          .eq("id", entry.id);

        continue;
      }

      const { data: profile } = await client
        .from("profiles")
        .select("id, display_name")
        .eq("id", entry.user_id)
        .maybeSingle<UserProfile>();

      const knowledgeMatches = await retrieveKnowledgeMatches(entry.content, {
        matchCount: 6,
        similarityThreshold: 0.4
      });

      const knowledgeContext = knowledgeMatches
        .map((match, idx) => `[参考知識${idx + 1}] ${match.content}`)
        .join("\n\n");

      const prompt = buildPrompt(entry, profile ?? null, knowledgeContext);
      const thread = await threads.create();
      await threads.messages.create(thread.id, {
        role: "user",
        content: prompt
      });

      const comment = await runThreadCompletion(threads, thread.id);
      if (!comment) {
        throw new Error("Empty comment generated");
      }

      const completedAt = new Date().toISOString();
      await client
        .from("emotion_diary_entries")
        .update({
          ai_comment_status: "completed",
          ai_comment: comment,
          ai_comment_generated_at: completedAt,
          ai_comment_metadata: {
            knowledge_count: knowledgeMatches.length,
            job_id: job.id
          }
        })
        .eq("id", entry.id);

      await client
        .from("diary_ai_comment_jobs")
        .update({
          status: "completed",
          completed_at: completedAt,
          metadata: {
            ...baseMetadata,
            comment_length: comment.length,
            knowledge_count: knowledgeMatches.length
          }
        })
        .eq("id", job.id);

      processed += 1;
    } catch (jobError) {
      const attempt = job.attempt_count + 1;
      const finalStatus = attempt >= MAX_ATTEMPTS ? "failed" : "pending";
      await client
        .from("diary_ai_comment_jobs")
        .update({
          status: finalStatus,
          last_error: jobError instanceof Error ? jobError.message : String(jobError),
          completed_at: finalStatus === "failed" ? new Date().toISOString() : null
        })
        .eq("id", job.id);

      if (finalStatus === "failed") {
        failed += 1;
        await client
          .from("emotion_diary_entries")
          .update({
            ai_comment_status: "failed",
            ai_comment_metadata: { error: jobError instanceof Error ? jobError.message : String(jobError) }
          })
          .eq("id", job.entry_id);
      }
    }
  }

  return { processed, skipped, failed } as const;
};

export const getDiaryAiCommentStats = async () => {
  const client = getSupabaseAdminClient();
  const { count } = await client
    .from("diary_ai_comment_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return { pending: count ?? 0 };
};

export const getDelayOptions = () => DELAY_OPTIONS;
