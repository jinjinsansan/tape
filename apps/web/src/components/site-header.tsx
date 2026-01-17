"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/signout-button";
import {
  Menu,
  X,
  BookHeart,
  Bot,
  PlayCircle,
  CalendarHeart,
  Users,
  Settings,
  Home,
  UserCircle,
  MessageCircle,
  Radio,
  Globe
} from "lucide-react";
import { SITE_NAME_JP, SITE_TITLE_FONT_CLASS } from "@/lib/branding";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/diary", label: "感情日記", icon: BookHeart },
  { href: "/michelle", label: "Michelle AI", icon: Bot },
  { href: "/courses", label: "動画コース", icon: PlayCircle },
  { href: "/counselor", label: "カウンセリング", icon: CalendarHeart },
  { href: "/live", label: "ライブ勉強会", icon: Radio },
  { href: "/feed", label: "みんなの日記", icon: Users },
  { href: "/mypage", label: "マイページ", icon: UserCircle }
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [profileName, setProfileName] = React.useState<string | null>(null);
  const pathname = usePathname();

  // Close menu when route changes
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) {
          if (response.status === 401) {
            if (active) setProfileName(null);
            return;
          }
          throw new Error("Failed to load profile");
        }
        const payload = await response.json();
        if (!active) return;
        setProfileName(payload.profile?.displayName ?? payload.profile?.email ?? null);
      } catch (error) {
        if (active) {
          console.warn("Header profile fetch failed", error);
          setProfileName(null);
        }
      }
    };

    fetchProfile();
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#f0e4d8] bg-white/90 backdrop-blur-2xl shadow-[0_10px_30px_rgba(81,67,60,0.06)]">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className={cn("text-lg text-tape-brown", SITE_TITLE_FONT_CLASS)}>{SITE_NAME_JP}</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-[#d59da9]"
                    : "text-[#5a4a42] hover:text-[#d59da9]"
                )}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://lin.ee/hwaj6UP"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#f0e4d8] px-4 py-1 text-sm font-semibold text-[#06C755] hover:bg-[#06C755]/10"
            >
              <MessageCircle className="h-4 w-4" /> お問い合わせ
            </a>
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="text-[#a1928b] hover:text-[#51433c]">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <SignOutButton />
          </nav>

          <div className="flex items-center gap-3">
            {profileName && (
              <Link
                href="/mypage"
                className="hidden md:inline-flex max-w-[180px] items-center rounded-full border border-[#f0e4d8] bg-white px-4 py-1 text-sm font-semibold text-[#51433c] shadow-sm"
                title="マイページへ"
              >
                <UserCircle className="mr-2 h-4 w-4" />
                <span className="truncate">{profileName}</span>
              </Link>
            )}

            <div className="flex items-center gap-2 md:hidden">
              <SignOutButton />
              {profileName && (
                <Link
                  href="/mypage"
                  className="max-w-[120px] truncate text-sm font-semibold text-[#51433c]"
                  title="マイページへ"
                >
                  {profileName}
                </Link>
              )}
              <button
                className="p-2 text-[#51433c] focus:outline-none md:hidden"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full h-[calc(100vh-4rem)] bg-white/95 border-b border-[#f0e4d8] shadow-xl backdrop-blur-xl overflow-y-auto pb-10">
          <nav className="flex flex-col p-4 space-y-2">
            {profileName && (
              <div className="flex items-center gap-3 rounded-2xl border border-[#f0e4d8] bg-white px-4 py-3 text-sm font-semibold text-[#51433c]">
                <UserCircle className="h-5 w-5" />
                {profileName}
              </div>
            )}
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-[#fdeef1] text-[#d59da9]"
                    : "text-[#51433c] hover:bg-[#f7efe6]"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <a
              href="https://www.mentalai.team/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#51433c] hover:bg-[#f7efe6]"
            >
              <Globe className="h-5 w-5" />
              メンタルAIチーム
            </a>
            <hr className="my-2 border-[#f0e4d8]" />
            <a
              href="https://lin.ee/hwaj6UP"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[#06C755] hover:bg-[#06C755]/10"
            >
              <MessageCircle className="h-5 w-5" />
              お問い合わせ（公式LINE）
            </a>
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[#a3928a] hover:bg-[#f7efe6] hover:text-[#51433c]"
            >
              <Settings className="h-5 w-5" />
              管理者メニュー
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

