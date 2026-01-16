import { AuthGate } from "@/components/auth-gate";
import { HomeContent } from "@/components/home-content";
import { fetchNamisapoBlogPosts, fetchNamisapoNews } from "@/lib/namisapo";

export default async function Home() {
  const [newsItems, blogPosts] = await Promise.all([
    fetchNamisapoNews(4),
    fetchNamisapoBlogPosts(3)
  ]);

  return (
    <AuthGate>
      <HomeContent newsItems={newsItems} blogPosts={blogPosts} />
    </AuthGate>
  );
}
