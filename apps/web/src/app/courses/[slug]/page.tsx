import { CourseDetailClient } from "./course-detail-client";

export default function CourseDetailPage({ params }: { params: { slug: string } }) {
  return <CourseDetailClient slug={params.slug} />;
}
