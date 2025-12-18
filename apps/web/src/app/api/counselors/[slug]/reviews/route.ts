import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { createCounselorReview, listCounselorReviews } from "@/server/services/counselor-reviews";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const paramsSchema = z.object({ slug: z.string().min(1) });
const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(20).optional()
});
const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1)
});

export async function GET(request: Request, context: { params: { slug: string } }) {
  const { slug } = paramsSchema.parse(context.params);
  const searchParams = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  let viewerId: string | null = null;
  try {
    const user = await getRouteUser(supabase, `Counselor reviews: ${slug}`);
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

  try {
    const data = await listCounselorReviews({
      slug,
      viewerId,
      cursor: searchParams.cursor ?? null,
      limit: searchParams.limit ?? 10
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Failed to load counselor reviews", error);
    return NextResponse.json({ error: "レビューの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: { slug: string } }) {
  const { slug } = paramsSchema.parse(context.params);
  const body = bodySchema.parse(await request.json());
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  let viewerId: string | null = null;
  try {
    const user = await getRouteUser(supabase, `Counselor reviews: ${slug}`);
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
    const review = await createCounselorReview({
      slug,
      rating: body.rating,
      comment: body.comment,
      userId: viewerId
    });
    return NextResponse.json({ review });
  } catch (error) {
    console.error("Failed to create review", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "レビューの投稿に失敗しました" }, { status: 400 });
  }
}
