import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";
import { getMichelleOpenAIClient } from "@/lib/michelle/openai";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getDiaryEntryUrl } from "@/lib/michelle/diary";
import type { Database } from "@tape/supabase";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
});

const MODEL_NAME = process.env.MICHELLE_DIARY_TEMPLATE_MODEL || "gpt-4o-mini";
const MAX_MESSAGES = 18;

export async function POST(request: Request) {
  if (!MICHELLE_AI_ENABLED) {
    return NextResponse.json({ error: "Michelle AI is currently disabled" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient<Database>(cookieStore);

  let user;
  try {
    user = await getRouteUser(supabase, "Michelle diary template");
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable. Please try again later." },
        { status: 503 },
      );
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = parsed.data;

  const { data: session, error: sessionError } = await supabase
    .from("michelle_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("michelle_messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(60);

  if (messagesError) {
    console.error("Diary template: failed to load messages", messagesError);
    return NextResponse.json({ error: "会話履歴の取得に失敗しました" }, { status: 500 });
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "まだ会話がありません" }, { status: 400 });
  }

  const conversation = buildConversationSnapshot(messages, MAX_MESSAGES);
  const openai = getMichelleOpenAIClient();
  const systemPrompt = `あなたはテープ式心理学AIの秘書です。会話ログからユーザーの心情を整理し、以下のJSON形式に必ず従って短く要約してください。
{
  "event": "出来事や事実を20文字以内で",
  "emotion": "主要な感情を20文字以内で",
  "tape_phrase": "頭の中で繰り返す思い込みを25文字以内で",
  "reframe": "別の見方や仮説を25文字以内で",
  "next_step": "今日の小さな一歩を25文字以内で"
}
・各項目はユーザーの文脈を反映し、存在しない場合は「（未）」としてください。
・記号や絵文字は使用せず、自然な日本語で書いてください。`;

  const userPrompt = `以下は最新の会話です。直近の文脈を踏まえてJSONだけを出力してください。
${conversation}`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsedContent = safeJsonParse(content);

    const fields = {
      event: normalizeField(parsedContent.event),
      emotion: normalizeField(parsedContent.emotion),
      tape_phrase: normalizeField(parsedContent.tape_phrase),
      reframe: normalizeField(parsedContent.reframe),
      next_step: normalizeField(parsedContent.next_step),
    };

    const diaryLink = getDiaryEntryUrl();
    const rows = [
      { label: "出来事（事実）", value: fields.event },
      { label: "感情", value: fields.emotion },
      { label: "頭のセリフ（テープ）", value: fields.tape_phrase },
      { label: "別の見方（仮説）", value: fields.reframe },
      { label: "今日の小さな一歩", value: fields.next_step },
    ];

    const block = formatDiaryBlock("【今日の整理メモ】", rows, diaryLink);

    return NextResponse.json({
      heading: "【今日の整理メモ】",
      rows,
      block,
      diaryLink,
    });
  } catch (error) {
    console.error("Diary template OpenAI error", error);
    return NextResponse.json({ error: "日記テンプレの生成に失敗しました" }, { status: 500 });
  }
}

const buildConversationSnapshot = (
  messages: { role: string; content: string; created_at: string }[],
  limit: number,
) => {
  const recent = messages.slice(-limit);
  return recent
    .map((msg) => {
      const label = msg.role === "assistant" ? "ミシェル" : "ユーザー";
      const cleaned = msg.content.replace(/\s+/g, " ").trim();
      return `${label}: ${cleaned}`;
    })
    .join("\n");
};

const safeJsonParse = (input: string) => {
  try {
    return JSON.parse(input ?? "{}");
  } catch {
    return {};
  }
};

const normalizeField = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    return "（未）";
  }
  return value.trim().slice(0, 40);
};

const formatDiaryBlock = (
  heading: string,
  rows: { label: string; value: string }[],
  diaryLink: string,
) => {
  const lines = rows.map((row) => `・${row.label}：${row.value}`);
  return `${heading}\n${lines.join("\n")}\n\n→ 30秒で日記に残す：${diaryLink}`;
};
