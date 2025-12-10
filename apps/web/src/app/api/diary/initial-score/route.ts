import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import {
  getInitialScore,
  getPreviousWorthlessnessScore,
  upsertInitialScore
} from "@/server/services/diary";

const upsertSchema = z.object({
  selfEsteemScore: z.number().int().min(0).max(100),
  worthlessnessScore: z.number().int().min(0).max(100),
  measuredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
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
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const { response, user } = await requireUser(supabase, "Diary initial score get", accessToken);
  if (response) {
    return response;
  }

  try {
    const record = await getInitialScore(supabase, user!.id);
    const previousScore = await getPreviousWorthlessnessScore(supabase, user!.id, {
      initialScore: record ?? undefined
    });
    return NextResponse.json({ initialScore: record, previousScore });
  } catch (error) {
    console.error("Failed to load initial score", error);
    return NextResponse.json({ error: "Failed to load initial score" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const { response, user } = await requireUser(supabase, "Diary initial score upsert", accessToken);
  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.selfEsteemScore + parsed.data.worthlessnessScore !== 100) {
    return NextResponse.json({ error: "Scores must add up to 100" }, { status: 400 });
  }

  try {
    const record = await upsertInitialScore(supabase, user!.id, {
      self_esteem_score: parsed.data.selfEsteemScore,
      worthlessness_score: parsed.data.worthlessnessScore,
      measured_on: parsed.data.measuredOn
    });

    const previousScore = await getPreviousWorthlessnessScore(supabase, user!.id, {
      initialScore: record
    });

    return NextResponse.json({ initialScore: record, previousScore });
  } catch (error) {
    console.error("Failed to save initial score", error);
    return NextResponse.json({ error: "Failed to save initial score" }, { status: 500 });
  }
}
