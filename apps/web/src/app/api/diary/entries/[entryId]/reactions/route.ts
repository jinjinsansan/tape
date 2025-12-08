import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { fetchDiaryEntryById } from "@/server/services/diary";
import { reactionSchema } from "../../_schemas";

const paramsSchema = z.object({
  entryId: z.string().uuid()
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

export async function POST(request: Request, context: { params: { entryId: string } }) {
  const { entryId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response, user } = await requireUser(supabase, "Diary reaction create");
  if (response) {
    return response;
  }

  const entry = await fetchDiaryEntryById(supabase, entryId, user!.id);
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reaction payload" }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from("emotion_diary_reactions")
      .upsert(
        {
          entry_id: entryId,
          user_id: user!.id,
          reaction_type: parsed.data.reactionType
        },
        {
          onConflict: "entry_id,user_id,reaction_type"
        }
      );

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to create reaction", error);
    return NextResponse.json({ error: "Failed to create reaction" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: { entryId: string } }) {
  const { entryId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response, user } = await requireUser(supabase, "Diary reaction delete");
  if (response) {
    return response;
  }

  const entry = await fetchDiaryEntryById(supabase, entryId, user!.id);
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reaction payload" }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from("emotion_diary_reactions")
      .delete()
      .eq("entry_id", entryId)
      .eq("user_id", user!.id)
      .eq("reaction_type", parsed.data.reactionType);

    if (error) {
      throw error;
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete reaction", error);
    return NextResponse.json({ error: "Failed to delete reaction" }, { status: 500 });
  }
}
