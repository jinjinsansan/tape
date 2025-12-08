import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCourseForUser, CourseNotFoundError } from "@/server/services/courses";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";

const paramsSchema = z.object({
  slug: z.string().min(1)
});

export async function GET(_: Request, context: { params: { slug: string } }) {
  const { slug } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let userId: string | null = null;
  try {
    const user = await getRouteUser(supabase, `Course detail: ${slug}`);
    userId = user?.id ?? null;
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
    const course = await getCourseForUser(slug, userId);
    return NextResponse.json({ course });
  } catch (error) {
    if (error instanceof CourseNotFoundError) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    console.error("Failed to load course", error);
    return NextResponse.json({ error: "Failed to load course" }, { status: 500 });
  }
}
