import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { AuthGate } from "@/components/auth-gate";
import { HomeContent } from "@/components/home-content";
import { fetchNamisapoNews } from "@/lib/namisapo";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";

export default async function Home() {
  const newsItems = await fetchNamisapoNews(4);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  let sessionUser: User | null = null;
  let viewerRole: string | null = null;

  try {
    sessionUser = await getRouteUser(supabase, "Home page");
    if (sessionUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sessionUser.id)
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
    <AuthGate initialUser={sessionUser}>
      <HomeContent newsItems={newsItems} viewerRole={viewerRole} />
    </AuthGate>
  );
}
