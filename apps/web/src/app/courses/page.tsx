import { CoursesListClient } from "./courses-list-client";
import { SITE_NAME_JP } from "@/lib/branding";

export const metadata = {
  title: `動画コース | ${SITE_NAME_JP}`,
  description: "心理学を体系的に学べる動画コース一覧"
};

export default function CoursesPage() {
  return <CoursesListClient />;
}
