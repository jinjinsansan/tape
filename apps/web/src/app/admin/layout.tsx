import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Coins, 
  Share2, 
  AlertTriangle, 
  FileText, 
  Globe, 
  Megaphone,
  BookOpen,
  UserCheck,
  Settings
} from "lucide-react";

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
    redirect("/login?error=管理者パネルにアクセスするにはログインが必要です");
  }

  if (!user) {
    redirect("/login?error=管理者パネルにアクセスするにはログインが必要です");
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

  const navItems = [
    { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
    { href: "/admin/users", label: "ユーザー管理", icon: Users },
    { href: "/admin/points", label: "ポイント管理", icon: Coins },
    { href: "/admin/share-monitoring", label: "Xシェア監視", icon: Share2 },
    { href: "/admin/reports", label: "通報管理", icon: AlertTriangle, badge: "未実装" },
    { href: "/admin/diary", label: "日記管理", icon: FileText, badge: "未実装" },
    { href: "/admin/feed", label: "みんなの日記", icon: Globe, badge: "未実装" },
    { href: "/admin/broadcasts", label: "お知らせ配信", icon: Megaphone, badge: "未実装" },
    { href: "/admin/courses", label: "コース管理", icon: BookOpen, badge: "未実装" },
    { href: "/admin/counselors", label: "カウンセラー", icon: UserCheck, badge: "未実装" },
    { href: "/admin/settings", label: "設定", icon: Settings, badge: "未実装" }
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar navItems={navItems} userRole={userRole} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
