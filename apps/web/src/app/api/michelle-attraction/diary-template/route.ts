import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";
import { getMichelleAttractionOpenAIClient } from "@/lib/michelle-attraction/openai";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getDiaryEntryUrl } from "@/lib/michelle/diary";
import type { Database } from "@tape/supabase";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
});

const MODEL_NAME = process.env.MICHELLE_ATTRACTION_DIARY_MODEL || "gpt-4o-mini";
const MAX_MESSAGES = 18;

export async function POST(request: Request) {
  if (!MICHELLE_ATTRACTION_AI_ENABLED) {
    return NextResponse.json({ error: "Michelle Attraction AI is currently disabled" }, { status: 503 });
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
    user = await getRouteUser(supabase, "Michelle attraction diary template");
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
    .from("michelle_attraction_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("michelle_attraction_messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(60);

  if (messagesError) {
    console.error("Attraction diary template: failed to load messages", messagesError);
    return NextResponse.json({ error: "会話履歴の取得に失敗しました" }, { status: 500 });
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "まだ会話がありません" }, { status: 400 });
  }

  const conversation = buildConversationSnapshot(messages, MAX_MESSAGES);
  const openai = getMichelleAttractionOpenAIClient();

  const systemPrompt = `あなたは引き寄せ講座のコンシェルジュです。会話ログを要約し、以下のJSONキーを埋めてください。
{
  "desire": "叶えたい望みを20文字以内で",
  "brake": "不安や思い込みを20文字以内で",
  "tape_hypothesis": "根底のテープ仮説を25文字以内で",
  "affirmation": "波動を整える一言を25文字以内で",
  "one_action": "今日の1アクションを25文字以内で"
}
・各項目は会話内容を根拠にし、無理に脚色しない。
・情報が足りない場合は「（未）」と記載。
・出力はJSONのみ、余計な文章は禁止。`;

  const userPrompt = `以下の会話を要約し、指定のJSONで返してください。
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
      desire: normalizeField(parsedContent.desire),
      brake: normalizeField(parsedContent.brake),
      tape_hypothesis: normalizeField(parsedContent.tape_hypothesis),
      affirmation: normalizeField(parsedContent.affirmation),
      one_action: normalizeField(parsedContent.one_action),
    };

    const diaryLink = getDiaryEntryUrl();
    const rows = [
      { label: "望み", value: fields.desire },
      { label: "ブレーキ（不安/思い込み）", value: fields.brake },
      { label: "テープ仮説", value: fields.tape_hypothesis },
      { label: "整える一言", value: fields.affirmation },
      { label: "今日の1アクション", value: fields.one_action },
    ];

    const block = formatDiaryBlock("【現実創造メモ】", rows, diaryLink);

    return NextResponse.json({
      heading: "【現実創造メモ】",
      rows,
      block,
      diaryLink,
    });
  } catch (error) {
    console.error("Attraction diary template OpenAI error", error);
    return NextResponse.json({ error: "現実創造メモの生成に失敗しました" }, { status: 500 });
  }
}

const buildConversationSnapshot = (
  messages: { role: string; content: string; created_at: string }[],
  limit: number,
) => {
  const recent = messages.slice(-limit);
  return recent
    .map((msg) => {
      const label = msg.role === "assistant" ? "ミシェル引き寄せ" : "ユーザー";
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
