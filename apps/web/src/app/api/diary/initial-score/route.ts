import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { getInitialScore, getPreviousWorthlessnessScore } from "@/server/services/diary";

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
  return NextResponse.json(
    { error: "Initial scores are now managed via the self-assessment tool." },
    { status: 410 }
  );
}
