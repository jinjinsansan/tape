import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { DiaryAssistantClient } from "./diary-assistant-client";
import { AuthGate } from "@/components/auth-gate";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";

export default async function DiaryAssistantPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  let user: User | null = null;

  try {
    user = await getRouteUser(supabase, "Diary assistant page");
  } catch (error) {
    console.error("Failed to get user for diary assistant page", error);
  }

  return (
    <AuthGate initialUser={user}>
      <div className="min-h-screen bg-[#f9f3ef] p-4 pb-16 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <DiaryAssistantClient />
        </div>
      </div>
    </AuthGate>
  );
}
