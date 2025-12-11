import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function DELETE(
  _: Request,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin delete course module");
  if (response) return response;

  const adminClient = getSupabaseAdminClient();

  try {
    const { data: targetModule, error: fetchError } = await adminClient
      .from("learning_course_modules")
      .select("id")
      .eq("id", params.moduleId)
      .eq("course_id", params.courseId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!targetModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const { error: deleteError } = await adminClient
      .from("learning_course_modules")
      .delete()
      .eq("id", params.moduleId);

    if (deleteError) throw deleteError;

    await updateCourseDuration(adminClient, params.courseId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete module:", error);
    return NextResponse.json(
      { error: "Failed to delete module" },
      { status: 500 }
    );
  }
}

async function updateCourseDuration(supabase: ReturnType<typeof getSupabaseAdminClient>, courseId: string) {
  try {
    const { data: modules } = await supabase
      .from("learning_course_modules")
      .select("id")
      .eq("course_id", courseId);

    if (!modules || modules.length === 0) {
      await supabase
        .from("learning_courses")
        .update({ total_duration_seconds: 0 })
        .eq("id", courseId);
      return;
    }

    const moduleIds = modules.map((module) => module.id);

    const { data: lessons } = await supabase
      .from("learning_lessons")
      .select("video_duration_seconds")
      .in("module_id", moduleIds);

    const totalSeconds = (lessons ?? []).reduce(
      (sum, lesson) => sum + (lesson.video_duration_seconds || 0),
      0
    );

    await supabase
      .from("learning_courses")
      .update({ total_duration_seconds: totalSeconds })
      .eq("id", courseId);
  } catch (error) {
    console.error("Failed to update course duration after module deletion", error);
  }
}
