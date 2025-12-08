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
import type { Database } from "@tape/supabase";

const requestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
  category: z.enum(["love", "life", "relationship"]).optional()
});

type OpenAIThreads = NonNullable<NonNullable<ReturnType<typeof getMichelleOpenAIClient>["beta"]>["threads"]>;

export async function POST(request: Request) {
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

    const knowledgeMatches = await retrieveKnowledgeMatches(parsed.data.message, {
      matchCount: 8,
      similarityThreshold: 0.45
    });

    const openai = getMichelleOpenAIClient();
    const betaThreads = openai.beta?.threads as OpenAIThreads | undefined;
    if (!betaThreads) {
      throw new Error("OpenAI Assistants API is unavailable in the current SDK version");
    }

    const knowledgeContext = knowledgeMatches
      .map((match, index) => `[参考知識${index + 1}]\n${match.content}`)
      .join("\n\n");

    const finalMessage = knowledgeContext
      ? `【ユーザーメッセージ】\n${parsed.data.message}\n\n---\n内部参考情報（ユーザーには見せないこと）：\n${knowledgeContext}`
      : parsed.data.message;

    await supabase.from("michelle_messages").insert({
      session_id: sessionId,
      role: "user",
      content: parsed.data.message
    });

    try {
      await betaThreads.messages.create(threadId, {
        role: "user",
        content: finalMessage
      });
    } catch (openaiError) {
      console.error("OpenAI message creation error", openaiError);
      throw openaiError;
    }

    const assistantResponse = await runBufferedCompletion(betaThreads, threadId);

    if (assistantResponse.trim()) {
      await supabase.from("michelle_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: assistantResponse
      });
    }

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
}

const resolveSession = async (
  supabase: ReturnType<typeof createSupabaseRouteClient<Database>>,
  userId: string,
  sessionId: string | undefined,
  message: string,
  category: z.infer<typeof requestSchema>["category"]
) => {
  if (sessionId) {
    const { data, error } = await supabase
      .from("michelle_sessions")
      .select("id, openai_thread_id")
      .eq("id", sessionId)
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("Session not found");
    }

    const threadId = await ensureThreadId(supabase, data.id, data.openai_thread_id);
    return { sessionId: data.id, threadId };
  }

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
    throw error ?? new Error("Failed to create session");
  }

  const threadId = await ensureThreadId(supabase, data.id, null);
  return { sessionId: data.id, threadId };
};

const ensureThreadId = async (
  supabase: ReturnType<typeof createSupabaseRouteClient<Database>>,
  sessionId: string,
  threadId: string | null
) => {
  if (threadId) return threadId;

  const openai = getMichelleOpenAIClient();
  const betaThreads = openai.beta?.threads;
  if (!betaThreads) {
    throw new Error("OpenAI Assistants API is unavailable in the current SDK version");
  }

  const thread = await betaThreads.create();
  await supabase.from("michelle_sessions").update({ openai_thread_id: thread.id }).eq("id", sessionId);
  return thread.id;
};

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
        reject(error);
      })
      .on("end", () => resolve());
  });

  return fullReply;
};
