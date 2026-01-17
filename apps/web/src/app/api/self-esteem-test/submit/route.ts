import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import {
  submitSelfEsteemAnswers,
  getSelfEsteemTestStatus,
  SELF_ESTEEM_TEST_ALREADY_POSTED
} from "@/server/services/self-esteem-test";
import type { AnswerPayload, AnswerValue } from "@/lib/self-esteem/types";

type SubmitBody = {
  answers: AnswerPayload[];
};

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const user = await getRouteUser(supabase, "Self esteem submit");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: SubmitBody;
  try {
    payload = (await request.json()) as SubmitBody;
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!Array.isArray(payload.answers) || payload.answers.length !== 5) {
    return NextResponse.json({ error: "5 answers are required" }, { status: 400 });
  }

  try {
    const status = await getSelfEsteemTestStatus(supabase, user.id);
    if (!status.canTakeTest) {
      return NextResponse.json({ error: "Test unavailable" }, { status: 403 });
    }

    const normalized: AnswerPayload[] = [];
    for (const answer of payload.answers) {
      const value = Number(answer.value);
      if (!Number.isFinite(value) || value < 1 || value > 5) {
        return NextResponse.json({ error: "Answers must be between 1 and 5" }, { status: 400 });
      }
      normalized.push({
        questionId: String(answer.questionId),
        value: value as AnswerValue
      });
    }

    const result = await submitSelfEsteemAnswers(supabase, user.id, normalized);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === SELF_ESTEEM_TEST_ALREADY_POSTED) {
      return NextResponse.json({ error: "Test already posted" }, { status: 403 });
    }
    console.error("Failed to submit self esteem test", error);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
