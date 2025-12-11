import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const supabase = createSupabaseRouteClient();
  const user = await getRouteUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, summary, order_index } = body;

    // Create module
    const { data: module, error } = await supabase
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
  const supabase = createSupabaseRouteClient();
  const user = await getRouteUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: modules, error } = await supabase
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
