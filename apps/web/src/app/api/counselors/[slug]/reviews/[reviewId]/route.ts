import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { deleteCounselorReview } from "@/server/services/counselor-reviews";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  slug: z.string().min(1),
  reviewId: z.string().uuid()
});

export async function DELETE(_: Request, context: { params: { slug: string; reviewId: string } }) {
  const { reviewId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let viewerId: string | null = null;
  try {
    const user = await getRouteUser(supabase, "Delete counselor review");
    viewerId = user?.id ?? null;
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    throw error;
  }

  if (!viewerId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  try {
    await deleteCounselorReview(reviewId, viewerId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete counselor review", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "削除に失敗しました" }, { status: 400 });
  }
}
