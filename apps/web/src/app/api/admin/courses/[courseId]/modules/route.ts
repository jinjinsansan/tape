import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin create course module");
  if (response) return response;
  const adminClient = getSupabaseAdminClient();

  try {
    const body = await req.json();
    const { title, summary, order_index } = body;

    // Create module
    const { data: module, error } = await adminClient
      .from("learning_course_modules")
      .insert({
        course_id: params.courseId,
        title,
        summary: summary || null,
        order_index: order_index || 1,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ module });
  } catch (error) {
    console.error("Failed to create module:", error);
    return NextResponse.json(
      { error: "Failed to create module" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin list course modules");
  if (response) return response;
  const adminClient = getSupabaseAdminClient();

  try {
    const { data: modules, error } = await adminClient
      .from("learning_course_modules")
      .select(`
        *,
        lessons:learning_lessons(count)
      `)
      .eq("course_id", params.courseId)
      .order("order_index");

    if (error) throw error;

    return NextResponse.json({ modules: modules || [] });
  } catch (error) {
    console.error("Failed to fetch modules:", error);
    return NextResponse.json(
      { error: "Failed to fetch modules" },
      { status: 500 }
    );
  }
}
