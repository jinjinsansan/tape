import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getRouteUser } from "@/server/auth";
import { CourseLearnClient } from "./course-learn-client";

type PageProps = {
  params: { slug: string };
};

export default async function CourseLearnPage({ params }: PageProps) {
  const { slug } = params;
  const supabase = getSupabaseAdminClient();
  const user = await getRouteUser();

  // Get course info
  const { data: courseData } = await supabase
    .from("learning_courses")
    .select("id, price, published")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!courseData) {
    redirect("/courses");
  }

  // Check access for paid courses
  if (courseData.price > 0) {
    if (!user) {
      redirect(`/courses/${slug}`);
    }

    const { data: purchaseData } = await supabase
      .from("course_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", courseData.id)
      .eq("status", "completed")
      .maybeSingle();

    if (!purchaseData) {
      redirect(`/courses/${slug}`);
    }
  }

  return <CourseLearnClient slug={slug} />;
}
