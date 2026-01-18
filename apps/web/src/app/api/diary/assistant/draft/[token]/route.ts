import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { consumeDiaryDraftToken } from "@/server/services/diary-ai-assistant";

const handleAuthError = (error: unknown) => {
  if (error instanceof SupabaseAuthUnavailableError) {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
  return null;
};

export async function GET(_: Request, context: { params: { token: string } }) {
  const token = context.params.token;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Diary assistant draft fetch");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const draft = await consumeDiaryDraftToken(token, user.id);
    return NextResponse.json({ draft });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) {
      return handled;
    }
    console.error("Failed to fetch diary assistant draft", error);
    return NextResponse.json({ error: (error as Error).message ?? "Failed to load draft" }, { status: 400 });
  }
}
