import { AuthGate } from "@/components/auth-gate";
import { HomeContent } from "@/components/home-content";
import { fetchNamisapoNews } from "@/lib/namisapo";

export default async function Home() {
  const newsItems = await fetchNamisapoNews(4);

  return (
    <AuthGate>
      <HomeContent newsItems={newsItems} />
    </AuthGate>
  );
}
