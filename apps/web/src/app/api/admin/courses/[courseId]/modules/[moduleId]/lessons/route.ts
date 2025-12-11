import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin create course lesson");
  if (response) return response;
  const adminClient = getSupabaseAdminClient();

  try {
    const body = await req.json();
    const {
      title,
      slug,
      summary,
      video_url,
      video_duration_seconds,
      key_points,
      order_index,
    } = body;

    // Create lesson
    const { data: lesson, error } = await adminClient
      .from("learning_lessons")
      .insert({
        module_id: params.moduleId,
        slug: slug || `lesson-${Date.now()}`,
        title,
        summary: summary || null,
        video_url: video_url || null,
        video_duration_seconds: video_duration_seconds || null,
        resources: key_points ? { keyPoints: key_points } : null,
        order_index: order_index || 1,
        requires_quiz: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Update course total duration
    await updateCourseDuration(adminClient, params.courseId);

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("Failed to create lesson:", error);
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin list course lessons");
  if (response) return response;
  const adminClient = getSupabaseAdminClient();

  try {
    const { data: lessons, error } = await adminClient
      .from("learning_lessons")
      .select("*")
      .eq("module_id", params.moduleId)
      .order("order_index");

    if (error) throw error;

    return NextResponse.json({ lessons: lessons || [] });
  } catch (error) {
    console.error("Failed to fetch lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
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

    if (!modules || modules.length === 0) return;

    const moduleIds = modules.map((m: any) => m.id);

    const { data: lessons } = await supabase
      .from("learning_lessons")
      .select("video_duration_seconds")
      .in("module_id", moduleIds);

    const totalSeconds = (lessons || []).reduce(
      (sum: number, lesson: any) =>
        sum + (lesson.video_duration_seconds || 0),
      0
    );

    await supabase
      .from("learning_courses")
      .update({ total_duration_seconds: totalSeconds })
      .eq("id", courseId);
  } catch (error) {
    console.error("Failed to update course duration:", error);
  }
}
