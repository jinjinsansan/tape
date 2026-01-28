import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { AuthGate } from "@/components/auth-gate";
import { MindTreeDashboard } from "./mind-tree-dashboard";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";

export const metadata = {
  title: "ゴールの木 - Tape",
  description: "日記を書くたびに色を変えながら成長していく、あなただけのゴールの木"
};

export default async function MindTreePage() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  
  let user: User | null = null;
  try {
    user = await getRouteUser(supabase, "Mind tree page");
  } catch (error) {
    console.error("Failed to get user for mind tree page", error);
  }

  return (
    <AuthGate initialUser={user}>
      <MindTreeDashboard userId={user?.id ?? null} />
    </AuthGate>
  );
}
