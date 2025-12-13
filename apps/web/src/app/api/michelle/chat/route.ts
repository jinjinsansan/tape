import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type OpenAI from "openai";
import { z } from "zod";

import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";
import { getMichelleAssistantId, getOpenAIApiKey } from "@/lib/env";
import { getMichelleOpenAIClient } from "@/lib/michelle/openai";
import { retrieveKnowledgeMatches } from "@/lib/michelle/rag";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { trackApi } from "@/server/monitoring";
import type { Database } from "@tape/supabase";

const requestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
  category: z.enum(["love", "life", "relationship"]).optional()
});

type OpenAIThreads = NonNullable<NonNullable<ReturnType<typeof getMichelleOpenAIClient>["beta"]>["threads"]>;

export async function POST(request: Request) {
  return trackApi("michelle_chat_post", async () => {
    if (!MICHELLE_AI_ENABLED) {
      return NextResponse.json({ error: "Michelle AI is currently disabled" }, { status: 503 });
    }

    if (!getOpenAIApiKey()) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
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
      user = await getRouteUser(supabase, "Michelle chat");
    } catch (error) {
      if (error instanceof SupabaseAuthUnavailableError) {
        return NextResponse.json(
          { error: "Authentication service is temporarily unavailable. Please try again later." },
          { status: 503 }
        );
      }
      throw error;
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const { sessionId, threadId } = await resolveSession(
      supabase,
      user.id,
      parsed.data.sessionId,
      parsed.data.message,
      parsed.data.category
    );

    // RAG検索で関連する心理学知識を取得
    console.log(`[Michelle Chat] User message: "${parsed.data.message.slice(0, 50)}..."`);
    const knowledgeMatches = await retrieveKnowledgeMatches(parsed.data.message, {
      matchCount: 8,
      similarityThreshold: 0.45
    });

    console.log(`[Michelle Chat] RAG matches: ${knowledgeMatches.length}`);
    if (knowledgeMatches.length > 0) {
      console.log(
        `[Michelle Chat] Top 3 similarities:`,
        knowledgeMatches
          .slice(0, 3)
          .map((m) => m.similarity.toFixed(3))
          .join(", ")
      );
    }

    const openai = getMichelleOpenAIClient();
    const betaThreads = openai.beta?.threads as OpenAIThreads | undefined;
    if (!betaThreads) {
      throw new Error("OpenAI Assistants API is unavailable in the current SDK version");
    }

    // RAG知識をコンテキストとして構築
    const knowledgeContext = knowledgeMatches
      .map((match, index) => `[参考知識${index + 1}]\n${match.content}`)
      .join("\n\n");

    // LLMに送る最終メッセージ（RAG知識を注入）
    const finalMessage = knowledgeContext
      ? `【ユーザーメッセージ】\n${parsed.data.message}\n\n---\n内部参考情報（ユーザーには見せないこと）：\n以下のミシェル心理学知識を参考にして回答を構築してください。\n${knowledgeContext}`
      : parsed.data.message;

    // ユーザーメッセージをデータベースに保存
    await supabase.from("michelle_messages").insert({
      session_id: sessionId,
      role: "user",
      content: parsed.data.message
    });

    // OpenAI Assistants APIにメッセージを送信
    try {
      await betaThreads.messages.create(threadId, {
        role: "user",
        content: finalMessage
      });
    } catch (openaiError) {
      console.error("[Michelle Chat] OpenAI message creation error:", openaiError);

      // 400エラー: runが実行中の場合はユーザーに通知
      if (openaiError instanceof Error && openaiError.message.includes("while a run")) {
        return NextResponse.json(
          { error: "前の応答がまだ処理中です。少しお待ちください。" },
          { status: 429 }
        );
      }

      throw openaiError;
    }

    // OpenAI Assistants APIでアシスタント応答を生成
    console.log("[Michelle Chat] Starting assistant completion...");
    const assistantResponse = await runBufferedCompletion(betaThreads, threadId);
    console.log(`[Michelle Chat] Assistant response length: ${assistantResponse.length} chars`);

    // アシスタントレスポンスをデータベースに保存
    if (assistantResponse.trim()) {
      await supabase.from("michelle_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: assistantResponse
      });
      console.log("[Michelle Chat] Assistant message saved to database");
    }

      console.log("[Michelle Chat] Chat completion successful");
      return NextResponse.json({
        sessionId,
        message: assistantResponse,
        knowledge: knowledgeMatches.slice(0, 4)
      });
    } catch (error) {
      console.error("Michelle chat error", error);
      const message = error instanceof Error ? error.message : "Internal Server Error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

/**
 * セッションを解決（既存セッション取得 or 新規作成）
 */
const resolveSession = async (
  supabase: ReturnType<typeof createSupabaseRouteClient<Database>>,
  userId: string,
  sessionId: string | undefined,
  message: string,
  category: z.infer<typeof requestSchema>["category"]
) => {
  // 既存セッションがある場合は取得
  if (sessionId) {
    console.log(`[Michelle Chat] Resolving existing session: ${sessionId}`);
    const { data, error } = await supabase
      .from("michelle_sessions")
      .select("id, openai_thread_id")
      .eq("id", sessionId)
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (error || !data) {
      console.error("[Michelle Chat] Session not found:", error);
      throw new Error("Session not found");
    }

    const threadId = await ensureThreadId(supabase, data.id, data.openai_thread_id);
    console.log(`[Michelle Chat] Resolved session ${data.id} with thread ${threadId}`);
    return { sessionId: data.id, threadId };
  }

  // 新規セッションを作成
  console.log(`[Michelle Chat] Creating new session for user ${userId}, category: ${category ?? "life"}`);
  const { data, error } = await supabase
    .from("michelle_sessions")
    .insert({
      auth_user_id: userId,
      category: category ?? "life",
      title: message.trim().slice(0, 60) || "新しい相談"
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[Michelle Chat] Failed to create session:", error);
    throw error ?? new Error("Failed to create session");
  }

  const threadId = await ensureThreadId(supabase, data.id, null);
  console.log(`[Michelle Chat] Created new session ${data.id} with thread ${threadId}`);
  return { sessionId: data.id, threadId };
};

/**
 * OpenAI Thread IDを確保（既存があれば使用、なければ新規作成）
 */
const ensureThreadId = async (
  supabase: ReturnType<typeof createSupabaseRouteClient<Database>>,
  sessionId: string,
  threadId: string | null
) => {
  // 既存のThread IDがあれば使用
  if (threadId) {
    console.log(`[Michelle Chat] Using existing thread: ${threadId}`);
    return threadId;
  }

  // 新規Thread作成
  console.log("[Michelle Chat] Creating new OpenAI thread...");
  const openai = getMichelleOpenAIClient();
  const betaThreads = openai.beta?.threads;
  if (!betaThreads) {
    throw new Error("OpenAI Assistants API is unavailable in the current SDK version");
  }

  const thread = await betaThreads.create();
  console.log(`[Michelle Chat] Created new thread: ${thread.id}`);

  // Thread IDをデータベースに保存
  await supabase.from("michelle_sessions").update({ openai_thread_id: thread.id }).eq("id", sessionId);
  return thread.id;
};

/**
 * OpenAI Assistants APIでアシスタント応答を生成（ストリーミング→バッファード）
 */
const runBufferedCompletion = async (threads: OpenAIThreads, threadId: string) => {
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
      .on("error", (error: unknown) => {
        console.error("[Michelle Chat] Stream error:", error);
        reject(error);
      })
      .on("end", () => {
        console.log("[Michelle Chat] Stream completed");
        resolve();
      });
  });

  return fullReply;
};
