import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getRouteUser } from "@/server/auth";
import { isPrivilegedUser } from "@/server/services/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const user = await getRouteUser();
    const isPrivileged = user ? await isPrivilegedUser(user.id, supabase) : false;

    // Get all published courses
    const { data: courses, error } = await supabase
      .from("learning_courses")
      .select("id, slug, title, subtitle, description, price, currency, level, tags, total_duration_seconds, hero_url")
      .eq("published", true)
      .order("price", { ascending: true }); // Free courses first

    if (error) {
      throw error;
    }

    // Check if user has purchased each course
    let purchases: { course_id: string }[] = [];
    if (user) {
      const { data: purchaseData } = await supabase
        .from("course_purchases")
        .select("course_id")
        .eq("user_id", user.id)
        .eq("status", "completed");

      purchases = purchaseData || [];
    }

    const purchaseSet = new Set(purchases.map((p) => p.course_id));

    const coursesWithPurchaseStatus = (courses || []).map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      price: course.price,
      currency: course.currency,
      level: course.level,
      tags: course.tags,
      totalDurationSeconds: course.total_duration_seconds,
      heroUrl: course.hero_url,
      isPurchased: isPrivileged || course.price === 0 || purchaseSet.has(course.id)
    }));

    return NextResponse.json({ courses: coursesWithPurchaseStatus });
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
