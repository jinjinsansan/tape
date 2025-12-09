import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { searchDiaryEntries } from "@/server/services/diary";

const querySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  emotion: z.string().max(48).optional(),
  keyword: z.string().max(256).optional(),
  page: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
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

const requireUser = async (supabase: ReturnType<typeof createSupabaseRouteClient>, context: string) => {
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const { response, user } = await requireUser(supabase, "Diary history list");
  if (response) {
    return response;
  }

  try {
    const { entries, count } = await searchDiaryEntries(supabase, {
      userId: user!.id,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      emotion: parsed.data.emotion,
      keyword: parsed.data.keyword,
      limit: parsed.data.limit,
      page: parsed.data.page
    });

    return NextResponse.json({ entries, count });
  } catch (error) {
    console.error("Failed to load diary history", error);
    return NextResponse.json({ error: "Failed to load diary history" }, { status: 500 });
  }
}
