import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";

import { AdminClient } from "./admin-client";

export default async function AdminPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let user;
  try {
    user = await getRouteUser(supabase, "Admin page");
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      redirect("/");
    }
    throw error;
  }

  if (!user) {
    redirect("/");
  }

  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (error || profile?.role !== "admin") {
    redirect("/");
  }

  return <AdminClient />;
}
