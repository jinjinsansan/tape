import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import {
  createDiaryAssistantSession,
  recordPrimaryAnswer,
  recordDetailAnswer,
  setEmotionForSession,
  setManualSelfEsteemScore,
  loadSelfEsteemQuestions,
  submitSelfEsteemFromAssistant,
  generateAssistantDraft,
  createDiaryDraftToken
} from "@/server/services/diary-ai-assistant";

const answerSchema = z.object({
  questionId: z.string().min(1),
  value: z.number().int().min(1).max(5)
});

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({
    action: z.literal("answer"),
    sessionId: z.string().uuid(),
    step: z.enum(["event", "detail"]),
    message: z.string().min(1)
  }),
  z.object({
    action: z.literal("emotion"),
    sessionId: z.string().uuid(),
    emotion: z.string().min(1)
  }),
  z.object({
    action: z.literal("self_esteem_value"),
    sessionId: z.string().uuid(),
    score: z.number().min(1).max(100)
  }),
  z.object({
    action: z.literal("self_esteem_questions"),
    sessionId: z.string().uuid()
  }),
  z.object({
    action: z.literal("self_esteem_submit"),
    sessionId: z.string().uuid(),
    answers: z.array(answerSchema).length(5)
  }),
  z.object({
    action: z.literal("generate_draft"),
    sessionId: z.string().uuid()
  }),
  z.object({
    action: z.literal("save_draft"),
    sessionId: z.string().uuid()
  })
]);

const handleAuthError = (error: unknown) => {
  if (error instanceof SupabaseAuthUnavailableError) {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
  return null;
};

const requireUser = async (
  params: { cookieStore: ReturnType<typeof cookies>; headers?: Headers | HeadersInit },
  context: string
) => {
  const supabase = createSupabaseRouteClient(params.cookieStore, params.headers);
  try {
    const user = await getRouteUser(supabase, context);
    if (!user) {
      return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
    }
    return { response: null, user };
  } catch (error) {
    const response = handleAuthError(error);
    if (response) {
      return { response, user: null };
    }
    throw error;
  }
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const cookieStore = cookies();
  const { response, user } = await requireUser({ cookieStore, headers: request.headers }, "Diary assistant");
  if (response || !user) {
    return response;
  }

  try {
    switch (parsed.data.action) {
      case "start": {
        const result = await createDiaryAssistantSession(user.id);
        return NextResponse.json(result);
      }
      case "answer": {
        if (parsed.data.step === "event") {
          const next = await recordPrimaryAnswer(parsed.data.sessionId, user.id, parsed.data.message);
          return NextResponse.json({ question: next.question, step: "detail" });
        }
        const status = await recordDetailAnswer(parsed.data.sessionId, user.id, parsed.data.message);
        return NextResponse.json({ ...status, step: "emotion" });
      }
      case "emotion": {
        const result = await setEmotionForSession(parsed.data.sessionId, user.id, parsed.data.emotion);
        return NextResponse.json(result);
      }
      case "self_esteem_value": {
        const result = await setManualSelfEsteemScore(parsed.data.sessionId, user.id, parsed.data.score);
        return NextResponse.json(result);
      }
      case "self_esteem_questions": {
        const result = await loadSelfEsteemQuestions(parsed.data.sessionId, user.id);
        return NextResponse.json(result);
      }
      case "self_esteem_submit": {
        const result = await submitSelfEsteemFromAssistant(parsed.data.sessionId, user.id, parsed.data.answers);
        return NextResponse.json(result);
      }
      case "generate_draft": {
        const draft = await generateAssistantDraft(parsed.data.sessionId, user.id);
        return NextResponse.json({ draft });
      }
      case "save_draft": {
        const token = await createDiaryDraftToken(parsed.data.sessionId, user.id);
        return NextResponse.json(token);
      }
      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Diary assistant error", error);
    return NextResponse.json({ error: (error as Error).message ?? "Unexpected error" }, { status: 500 });
  }
}
