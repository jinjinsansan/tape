import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { saveLessonNote, CourseNotFoundError, LessonAccessError } from "@/server/services/courses";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";

const paramsSchema = z.object({
  slug: z.string().min(1),
  lessonId: z.string().uuid()
});

const bodySchema = z.object({
  content: z.string().min(1).max(2000)
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

export async function POST(request: Request, context: { params: { slug: string; lessonId: string } }) {
  const { slug, lessonId } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let userId: string;
  try {
    const user = await getRouteUser(supabase, `Course note: ${slug}`);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } catch (error) {
    const response = handleAuthError(error);
    if (response) return response;
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid note payload" }, { status: 400 });
  }

  try {
    const course = await saveLessonNote(slug, lessonId, userId, parsed.data.content.trim());
    return NextResponse.json({ course });
  } catch (error) {
    if (error instanceof CourseNotFoundError) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (error instanceof LessonAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Failed to save lesson note", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
