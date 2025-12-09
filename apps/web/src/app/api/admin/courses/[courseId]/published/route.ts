import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { updateCoursePublished } from "@/server/services/admin";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

const paramsSchema = z.object({ courseId: z.string().uuid() });
const bodySchema = z.object({ published: z.boolean() });

export async function PATCH(request: Request, context: { params: { courseId: string } }) {
  const { courseId } = paramsSchema.parse(context.params);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin publish course");
  if (response) return response;

  try {
    await updateCoursePublished(courseId, parsed.data.published);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update course", error);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}
