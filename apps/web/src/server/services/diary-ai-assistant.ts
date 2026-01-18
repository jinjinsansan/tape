import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@tape/supabase";

import { EMOTIONS_REQUIRING_SCORE, findEmotionOption } from "@/constants/emotions";
import { getMichelleOpenAIClient } from "@/lib/michelle/openai";
import { getJstIsoNow, getTodayJstDate } from "@/lib/date/jst";
import { calculateWorthlessnessScore } from "@/lib/self-esteem/score";
import { selectQuestionsForUser } from "@/lib/self-esteem/question-selector";
import type { AnswerPayload, SelfEsteemQuestion } from "@/lib/self-esteem/types";
import { submitSelfEsteemAnswers } from "@/server/services/self-esteem-test";
import { getSupabaseAdminClient } from "@/server/supabase";

type Supabase = SupabaseClient<Database>;
type SessionRow = Database["public"]["Tables"]["diary_ai_sessions"]["Row"];
type DraftRow = Database["public"]["Tables"]["diary_ai_drafts"]["Row"];

type AssistantAnswers = {
  event?: string;
  detail?: string;
  selfEsteemInput?: number;
  selfEsteemSource?: "manual" | "test";
  selfEsteemTestDate?: string | null;
};

export type AssistantDraftPayload = {
  title: string;
  content: string;
  eventSummary: string;
  realization?: string | null;
  emotionLabel: string | null;
  journalDate: string;
  selfEsteemScore?: number | null;
  worthlessnessScore?: number | null;
  selfEsteemTestDate?: string | null;
};

const EVENT_QUESTION = "今日はどんな出来事がありましたか？";
const DETAIL_TEMPLATE = (event: string) =>
  `「${event.slice(0, 32)}」について、印象に残った場面や身体の反応をもう少し教えてください。`;

const supabaseAdmin = getSupabaseAdminClient();

const parseAnswers = (input: unknown): AssistantAnswers => {
  if (!input || typeof input !== "object") {
    return {};
  }
  const value = input as AssistantAnswers;
  return {
    event: typeof value.event === "string" ? value.event : undefined,
    detail: typeof value.detail === "string" ? value.detail : undefined,
    selfEsteemInput:
      typeof value.selfEsteemInput === "number" && Number.isFinite(value.selfEsteemInput)
        ? value.selfEsteemInput
        : undefined,
    selfEsteemSource: value.selfEsteemSource === "manual" || value.selfEsteemSource === "test"
      ? value.selfEsteemSource
      : undefined,
    selfEsteemTestDate: typeof value.selfEsteemTestDate === "string" ? value.selfEsteemTestDate : undefined
  };
};

const serializeAnswers = (answers: AssistantAnswers): Json => ({
  event: answers.event ?? null,
  detail: answers.detail ?? null,
  selfEsteemInput: answers.selfEsteemInput ?? null,
  selfEsteemSource: answers.selfEsteemSource ?? null,
  selfEsteemTestDate: answers.selfEsteemTestDate ?? null
});

const fetchSession = async (sessionId: string, userId: string): Promise<SessionRow> => {
  const { data, error } = await supabaseAdmin
    .from("diary_ai_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Session not found");
  }
  return data;
};

export const createDiaryAssistantSession = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from("diary_ai_sessions")
    .insert({
      user_id: userId,
      current_step: "event",
      status: "in_progress",
      answers: serializeAnswers({})
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to start session");
  }

  return { sessionId: data.id, question: EVENT_QUESTION };
};

export const recordPrimaryAnswer = async (sessionId: string, userId: string, message: string) => {
  const session = await fetchSession(sessionId, userId);
  const answers = parseAnswers(session.answers);
  answers.event = message.trim();

  await supabaseAdmin
    .from("diary_ai_sessions")
    .update({
      answers: serializeAnswers(answers),
      current_step: "detail"
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  return { question: DETAIL_TEMPLATE(answers.event ?? "今日のこと") };
};

export const recordDetailAnswer = async (sessionId: string, userId: string, message: string) => {
  const session = await fetchSession(sessionId, userId);
  const answers = parseAnswers(session.answers);
  answers.detail = message.trim();

  await supabaseAdmin
    .from("diary_ai_sessions")
    .update({
      answers: serializeAnswers(answers),
      current_step: "emotion"
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  return { readyForEmotion: true };
};

export const setEmotionForSession = async (sessionId: string, userId: string, emotion: string) => {
  const requiresScore = EMOTIONS_REQUIRING_SCORE.has(emotion);

  await supabaseAdmin
    .from("diary_ai_sessions")
    .update({ emotion })
    .eq("id", sessionId)
    .eq("user_id", userId);

  return { requiresScore };
};

export const setManualSelfEsteemScore = async (
  sessionId: string,
  userId: string,
  score: number
) => {
  const normalized = Math.max(1, Math.min(100, Math.round(score)));
  const worthlessness = Math.round(calculateWorthlessnessScore(normalized));
  const answers = parseAnswers((await fetchSession(sessionId, userId)).answers);
  answers.selfEsteemInput = normalized;
  answers.selfEsteemSource = "manual";
  answers.selfEsteemTestDate = getTodayJstDate();

  await supabaseAdmin
    .from("diary_ai_sessions")
    .update({
      answers: serializeAnswers(answers),
      self_esteem_score: normalized,
      worthlessness_score: worthlessness
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  return {
    selfEsteemScore: normalized,
    worthlessnessScore: worthlessness,
    testDate: answers.selfEsteemTestDate
  };
};

export const loadSelfEsteemQuestions = async (sessionId: string, userId: string) => {
  const { questions, testDate } = await selectQuestionsForUser(supabaseAdmin, userId);
  const session = await fetchSession(sessionId, userId);
  const answers = parseAnswers(session.answers);
  answers.selfEsteemTestDate = testDate;

  await supabaseAdmin
    .from("diary_ai_sessions")
    .update({ answers: serializeAnswers(answers) })
    .eq("id", sessionId)
    .eq("user_id", userId);

  return { questions, testDate };
};

export const submitSelfEsteemFromAssistant = async (
  sessionId: string,
  userId: string,
  answersPayload: AnswerPayload[]
) => {
  if (answersPayload.length !== 5) {
    throw new Error("5問の回答が必要です");
  }

  const session = await fetchSession(sessionId, userId);
  const answers = parseAnswers(session.answers);
  const testDate = answers.selfEsteemTestDate ?? getTodayJstDate();
  const result = await submitSelfEsteemAnswers(supabaseAdmin, userId, answersPayload);

  answers.selfEsteemInput = result.selfEsteemScore;
  answers.selfEsteemSource = "test";
  answers.selfEsteemTestDate = testDate;

  await supabaseAdmin
    .from("diary_ai_sessions")
    .update({
      answers: serializeAnswers(answers),
      self_esteem_score: result.selfEsteemScore,
      worthlessness_score: result.worthlessnessScore
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  return {
    selfEsteemScore: result.selfEsteemScore,
    worthlessnessScore: result.worthlessnessScore,
    testDate
  };
};

const buildDraftPrompt = (session: SessionRow, answers: AssistantAnswers): string => {
  const emotion = session.emotion ?? "";
  const emotionInfo = emotion ? findEmotionOption(emotion) : null;
  return JSON.stringify(
    {
      journalDate: getTodayJstDate(),
      emotion,
      emotionDescription: emotionInfo?.description ?? null,
      event: answers.event ?? "",
      detail: answers.detail ?? "",
      selfEsteemScore: session.self_esteem_score ?? null,
      worthlessnessScore: session.worthlessness_score ?? null
    },
    null,
    2
  );
};

const parseDraftResponse = (raw: string | null, fallback: AssistantDraftPayload): AssistantDraftPayload => {
  if (!raw) {
    return fallback;
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return {
      title: typeof parsed.title === "string" && parsed.title.trim().length > 0 ? parsed.title.trim() : fallback.title,
      content:
        typeof parsed.content === "string" && parsed.content.trim().length > 0
          ? parsed.content.trim()
          : fallback.content,
      eventSummary:
        typeof parsed.eventSummary === "string" && parsed.eventSummary.trim().length > 0
          ? parsed.eventSummary.trim()
          : fallback.eventSummary,
      realization:
        typeof parsed.realization === "string" && parsed.realization.trim().length > 0
          ? parsed.realization.trim()
          : fallback.realization,
      emotionLabel: fallback.emotionLabel,
      journalDate: typeof parsed.journalDate === "string" ? parsed.journalDate : fallback.journalDate,
      selfEsteemScore: fallback.selfEsteemScore,
      worthlessnessScore: fallback.worthlessnessScore,
      selfEsteemTestDate: fallback.selfEsteemTestDate
    };
  } catch (error) {
    console.error("Failed to parse assistant draft", error);
    return fallback;
  }
};

export const generateAssistantDraft = async (sessionId: string, userId: string) => {
  const session = await fetchSession(sessionId, userId);
  const answers = parseAnswers(session.answers);

  if (!answers.event || !answers.detail) {
    throw new Error("日記草稿を作成するには出来事と詳細が必要です");
  }

  const fallbackDraft: AssistantDraftPayload = {
    title: "今日の心の記録",
    content: `${answers.event}\n\n${answers.detail}`.trim(),
    eventSummary: answers.event,
    realization: answers.detail,
    emotionLabel: session.emotion ?? null,
    journalDate: getTodayJstDate(),
    selfEsteemScore: session.self_esteem_score ?? null,
    worthlessnessScore: session.worthlessness_score ?? null,
    selfEsteemTestDate: answers.selfEsteemTestDate ?? null
  };

  try {
    const openai = getMichelleOpenAIClient();
    const prompt = buildDraftPrompt(session, answers);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "あなたはテープ式心理学のAIメンター『ミシェル』です。ユーザーの出来事と感情をもとに、丁寧で共感的な日記下書きをJSONで返してください。JSONは {\"title\",\"content\",\"eventSummary\",\"realization\",\"journalDate\"} を含め、contentは500文字以内、改行2までに抑えること。"
        },
        { role: "user", content: prompt }
      ]
    });

    const text = completion.choices[0]?.message?.content ?? null;
    const draft = parseDraftResponse(text, fallbackDraft);

    await supabaseAdmin
      .from("diary_ai_sessions")
      .update({ draft: draft as Json, status: "draft_ready" })
      .eq("id", sessionId)
      .eq("user_id", userId);

    return draft;
  } catch (error) {
    console.error("Failed to generate assistant draft", error);
    await supabaseAdmin
      .from("diary_ai_sessions")
      .update({ draft: fallbackDraft as Json, status: "draft_ready" })
      .eq("id", sessionId)
      .eq("user_id", userId);
    return fallbackDraft;
  }
};

export const createDiaryDraftToken = async (sessionId: string, userId: string) => {
  const session = await fetchSession(sessionId, userId);
  const draftPayload = (session.draft as AssistantDraftPayload | null) ?? null;
  if (!draftPayload) {
    throw new Error("草稿がまだ生成されていません");
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString();

  const { error } = await supabaseAdmin.from("diary_ai_drafts").insert({
    session_id: sessionId,
    user_id: userId,
    token,
    payload: draftPayload as Json,
    expires_at: expiresAt
  });

  if (error) {
    throw error;
  }

  return { token };
};

export const consumeDiaryDraftToken = async (token: string, userId: string) => {
  const { data, error } = await supabaseAdmin
    .from("diary_ai_drafts")
    .select("*")
    .eq("token", token)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Draft not found");
  }

  if (data.status !== "active") {
    throw new Error("この下書きは使用済みです");
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error("下書きの有効期限が切れています");
  }

  await supabaseAdmin
    .from("diary_ai_drafts")
    .update({ status: "consumed" })
    .eq("id", data.id);

  return data.payload as AssistantDraftPayload;
};
