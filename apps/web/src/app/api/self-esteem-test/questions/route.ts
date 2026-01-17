import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getSelfEsteemTestStatus, getTodayQuestions } from "@/server/services/self-esteem-test";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const user = await getRouteUser(supabase, "Self esteem questions");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getSelfEsteemTestStatus(supabase, user.id);
    if (!status.canTakeTest) {
      return NextResponse.json({ error: "Test unavailable" }, { status: 403 });
    }

    const { questions, testDate } = await getTodayQuestions(supabase, user.id);
    return NextResponse.json({ testDate, questions });
  } catch (error) {
    console.error("Failed to load self esteem questions", error);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}
