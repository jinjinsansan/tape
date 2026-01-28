import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { AuthGate } from "@/components/auth-gate";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { DiaryHistoryClient } from "./diary-history-client";

export default async function DiaryHistoryPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  let user: User | null = null;

  try {
    user = await getRouteUser(supabase, "Diary history page");
  } catch (error) {
    console.error("Failed to get user for diary history page", error);
  }

  return (
    <AuthGate initialUser={user}>
      <DiaryHistoryClient />
    </AuthGate>
  );
}
