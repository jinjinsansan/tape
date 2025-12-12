import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import {
  createDiarySelfAssessment,
  getInitialScore,
  listSelfAssessments,
  upsertInitialScore
} from "@/server/services/diary";

const answersSchema = z
  .array(
    z.object({
      questionId: z.number().int().min(1),
      prompt: z.string().min(1).max(400),
      option: z.string().min(1).max(400),
      points: z.number().int().min(-20).max(20)
    })
  )
  .max(64)
  .optional();

const createSchema = z.object({
  agePath: z.enum(["teen", "adult", "senior"]),
  selfEsteemScore: z.number().int().min(0).max(100),
  worthlessnessScore: z.number().int().min(0).max(100),
  answers: answersSchema
});

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
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  context: string,
  accessToken?: string | null
) => {
  try {
    const user = await getRouteUser(supabase, context, accessToken ?? undefined);
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 20) : 5;

  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const { response, user } = await requireUser(supabase, "Diary self assessments list", accessToken);
  if (response) {
    return response;
  }

  try {
    const [assessments, initialScore] = await Promise.all([
      listSelfAssessments(supabase, user!.id, limit),
      getInitialScore(supabase, user!.id)
    ]);

    return NextResponse.json({
      assessments,
      latest: assessments[0] ?? null,
      initialScore
    });
  } catch (error) {
    console.error("Failed to load self assessments", error);
    return NextResponse.json({ error: "Failed to load assessments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const { response, user } = await requireUser(supabase, "Diary self assessment create", accessToken);
  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.selfEsteemScore + parsed.data.worthlessnessScore !== 100) {
    return NextResponse.json({ error: "Scores must add up to 100" }, { status: 400 });
  }

  try {
    const measuredAt = new Date().toISOString();
    const assessment = await createDiarySelfAssessment(supabase, user!.id, {
      age_path: parsed.data.agePath,
      self_esteem_score: parsed.data.selfEsteemScore,
      worthlessness_score: parsed.data.worthlessnessScore,
      measured_at: measuredAt,
      metadata: parsed.data.answers ? { answers: parsed.data.answers } : {}
    });

    const initialScore = await upsertInitialScore(supabase, user!.id, {
      self_esteem_score: assessment.self_esteem_score,
      worthlessness_score: assessment.worthlessness_score,
      measured_on: assessment.measured_at.slice(0, 10)
    });

    return NextResponse.json({ assessment, initialScore }, { status: 201 });
  } catch (error) {
    console.error("Failed to save self assessment", error);
    return NextResponse.json({ error: "Failed to save assessment" }, { status: 500 });
  }
}
