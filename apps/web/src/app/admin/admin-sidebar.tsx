"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Menu, 
  X, 
  ChevronLeft, 
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
  Settings,
  type LucideIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

type AdminSidebarProps = {
  userRole: string;
};

export function AdminSidebar({ userRole }: AdminSidebarProps) {
  const navItems: NavItem[] = [
    { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
    { href: "/admin/users", label: "ユーザー管理", icon: Users },
    { href: "/admin/points", label: "ポイント管理", icon: Coins },
    { href: "/admin/share-monitoring", label: "Xシェア監視", icon: Share2 },
    { href: "/admin/reports", label: "通報管理", icon: AlertTriangle },
    { href: "/admin/diary", label: "日記管理", icon: FileText },
    { href: "/admin/feed", label: "みんなの日記", icon: Globe },
    { href: "/admin/broadcasts", label: "お知らせ配信", icon: Megaphone },
    { href: "/admin/courses", label: "コース管理", icon: BookOpen },
    { href: "/admin/counselors", label: "カウンセラー", icon: UserCheck },
    { href: "/admin/settings", label: "設定", icon: Settings }
  ];
  
  const counselorNavItems: NavItem[] = (userRole === "counselor" || userRole === "admin") ? [
    { href: "/dashboard/counselor", label: "カウンセラーダッシュボード", icon: UserCheck }
  ] : [];
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-white p-2 shadow-lg lg:hidden"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-slate-200 p-6">
            <Link href="/" className="flex items-center gap-2 text-slate-900 hover:text-slate-700">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm font-semibold">サイトに戻る</span>
            </Link>
            <div className="mt-4">
              <p className="text-xs font-semibold tracking-[0.3em] text-rose-500">ADMIN PANEL</p>
              <h1 className="mt-1 text-xl font-black text-slate-900">管理者パネル</h1>
              <p className="mt-1 text-xs text-slate-500">
                {userRole === "admin" ? "管理者" : "カウンセラー"}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const isDisabled = !!item.badge;

                return (
                  <li key={item.href}>
                    <Link
                      href={isDisabled ? "#" : item.href}
                      onClick={(e) => {
                        if (isDisabled) {
                          e.preventDefault();
                          return;
                        }
                        setIsOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-rose-50 text-rose-600"
                          : isDisabled
                          ? "cursor-not-allowed text-slate-400"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
              
              {/* Counselor-specific items */}
              {counselorNavItems.length > 0 && (
                <>
                  <li className="my-3 border-t border-slate-200" />
                  {counselorNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-purple-50 text-purple-600"
                              : "text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </>
              )}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-200 p-4">
            <p className="text-xs text-slate-400">
              Tape 心理学プラットフォーム
              <br />
              Admin Panel v1.0
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
