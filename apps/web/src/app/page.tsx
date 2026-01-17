import { cookies } from "next/headers";

import { AuthGate } from "@/components/auth-gate";
import { HomeContent } from "@/components/home-content";
import { fetchNamisapoNews } from "@/lib/namisapo";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";

export default async function Home() {
  const newsItems = await fetchNamisapoNews(4);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  let viewerRole: string | null = null;

  try {
    const user = await getRouteUser(supabase, "Home page");
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      viewerRole = profile?.role ?? null;
    }
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      console.error("Supabase auth unavailable on Home page", error);
    } else {
      throw error;
    }
  }

  return (
    <AuthGate>
      <HomeContent newsItems={newsItems} viewerRole={viewerRole} />
    </AuthGate>
  );
}
