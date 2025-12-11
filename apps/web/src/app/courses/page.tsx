import { CoursesListClient } from "./courses-list-client";

export const metadata = {
  title: "動画コース | テープ式心理学",
  description: "心理学を体系的に学べる動画コース一覧"
};

export default function CoursesPage() {
  return <CoursesListClient />;
}
