import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { AuthGate } from "@/components/auth-gate";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { SelfEsteemTestClient } from "../diary/self-esteem-test/self-esteem-test-client";

export default async function SelfEsteemPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  let user: User | null = null;

  try {
    user = await getRouteUser(supabase, "Self esteem test page");
  } catch (error) {
    console.error("Failed to get user for self esteem page", error);
  }

  return (
    <AuthGate initialUser={user}>
      <SelfEsteemTestClient />
    </AuthGate>
  );
}
