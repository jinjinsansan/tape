import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getRouteUser } from "@/server/auth";
import { isPrivilegedUser } from "@/server/services/roles";
import { getInstallmentCourseConfig } from "@/server/services/courses";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    const supabase = getSupabaseAdminClient();
    const user = await getRouteUser();
    const isPrivileged = user ? await isPrivilegedUser(user.id, supabase) : false;

    // Get course with modules
    const { data: courseData, error: courseError } = await supabase
      .from("learning_courses")
      .select(
        `
        id,
        slug,
        title,
        subtitle,
        description,
        price,
        currency,
        level,
        tags,
        total_duration_seconds,
        hero_url,
        modules:learning_course_modules(
          id,
          title,
          summary,
          order_index
        )
      `
      )
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (courseError) {
      throw courseError;
    }

    if (!courseData) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Count lessons for each module
    const moduleIds = (courseData.modules || []).map((m: any) => m.id);
    let lessonCounts: Record<string, number> = {};
    let totalLessons = 0;

    if (moduleIds.length > 0) {
      const { data: lessonsData } = await supabase
        .from("learning_lessons")
        .select("module_id")
        .in("module_id", moduleIds);

      if (lessonsData) {
        totalLessons = lessonsData.length;
        lessonCounts = lessonsData.reduce((acc: Record<string, number>, lesson: any) => {
          acc[lesson.module_id] = (acc[lesson.module_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    // Check if user has purchased this course
    let isPurchased = courseData.price === 0 || isPrivileged; // Free or privileged users
    if (user && courseData.price > 0 && !isPurchased) {
      const { data: purchaseData } = await supabase
        .from("course_purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseData.id)
        .eq("status", "completed")
        .maybeSingle();

      isPurchased = !!purchaseData;
    }

    let installmentInfo: {
      enabled: boolean;
      priceYen: number;
      unlockedLessonCount: number;
      totalLessons: number;
    } | null = null;

    const installmentConfig = getInstallmentCourseConfig(courseData.slug);

    if (installmentConfig) {
      let unlockedLessonCount = 0;
      if (user) {
        if (isPurchased) {
          unlockedLessonCount = totalLessons;
        } else {
          const { data: unlockedRows } = await supabase
            .from("learning_lesson_unlocks")
            .select("id")
            .eq("user_id", user.id)
            .eq("course_id", courseData.id)
            .eq("status", "active");
          unlockedLessonCount = unlockedRows?.length ?? 0;
        }
      }

      installmentInfo = {
        enabled: true,
        priceYen: installmentConfig.lessonPriceYen,
        unlockedLessonCount,
        totalLessons
      };
    }

    const modules = (courseData.modules || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((module: any) => ({
        id: module.id,
        title: module.title,
        summary: module.summary,
        orderIndex: module.order_index,
        lessonsCount: lessonCounts[module.id] || 0
      }));

    const course = {
      id: courseData.id,
      slug: courseData.slug,
      title: courseData.title,
      subtitle: courseData.subtitle,
      description: courseData.description,
      price: courseData.price,
      currency: courseData.currency,
      level: courseData.level,
      tags: courseData.tags,
      totalDurationSeconds: courseData.total_duration_seconds,
      heroUrl: courseData.hero_url,
      modules,
      isPurchased,
      totalLessons,
      installmentInfo
    };

    return NextResponse.json({ course });
  } catch (error) {
    console.error("Failed to fetch course detail:", error);
    return NextResponse.json({ error: "Failed to fetch course detail" }, { status: 500 });
  }
}
