import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import {
  getSelfEsteemTestStatus,
  getTodayResult,
  getDiaryDraftPayload
} from "@/server/services/self-esteem-test";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const user = await getRouteUser(supabase, "Self esteem diary");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getSelfEsteemTestStatus(supabase, user.id);
    if (!status.hasCompletedToday) {
      return NextResponse.json({ error: "Test not completed yet" }, { status: 400 });
    }

    const result = await getTodayResult(supabase, user.id);
    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const draft = getDiaryDraftPayload(
      result.test_date,
      result.self_esteem_score,
      result.worthlessness_score
    );

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("Failed to prepare diary draft", error);
    return NextResponse.json({ error: "Failed to prepare diary" }, { status: 500 });
  }
}
