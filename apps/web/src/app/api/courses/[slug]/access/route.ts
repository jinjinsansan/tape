import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getRouteUser } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * Check if user has access to a course
 */
export async function GET(_: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    const supabase = getSupabaseAdminClient();
    const user = await getRouteUser();

    if (!user) {
      return NextResponse.json({ hasAccess: false, reason: "not_authenticated" });
    }

    // Get course info
    const { data: courseData, error: courseError } = await supabase
      .from("learning_courses")
      .select("id, price, published")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (courseError || !courseData) {
      return NextResponse.json({ hasAccess: false, reason: "course_not_found" }, { status: 404 });
    }

    // Free courses are always accessible
    if (courseData.price === 0) {
      return NextResponse.json({ hasAccess: true, reason: "free_course" });
    }

    // Check purchase status
    const { data: purchaseData } = await supabase
      .from("course_purchases")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("course_id", courseData.id)
      .eq("status", "completed")
      .maybeSingle();

    if (purchaseData) {
      return NextResponse.json({ hasAccess: true, reason: "purchased" });
    }

    return NextResponse.json({ hasAccess: false, reason: "not_purchased" });
  } catch (error) {
    console.error("Failed to check course access:", error);
    return NextResponse.json({ error: "Failed to check access" }, { status: 500 });
  }
}
