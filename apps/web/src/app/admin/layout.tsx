import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  
  let user;
  try {
    user = await getRouteUser(supabase, "Admin layout");
  } catch (error) {
    redirect("/?error=管理者パネルにアクセスするにはログインが必要です");
  }

  if (!user) {
    redirect("/?error=管理者パネルにアクセスするにはログインが必要です");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role ?? "user";

  if (userRole !== "admin" && userRole !== "counselor") {
    redirect("/?error=管理者権限が必要です");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar userRole={userRole} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
