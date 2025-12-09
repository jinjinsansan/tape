"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X, BookHeart, Bot, PlayCircle, CalendarHeart, Users, Settings, Home, UserCircle } from "lucide-react";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/diary", label: "感情日記", icon: BookHeart },
  { href: "/michelle", label: "Michelle AI", icon: Bot },
  { href: "/course/beginner", label: "動画コース", icon: PlayCircle },
  { href: "/counselor", label: "カウンセリング", icon: CalendarHeart },
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
    <header className="sticky top-0 z-50 w-full border-b border-tape-beige bg-tape-cream/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tape-brown text-tape-cream">
            <span className="font-bold">Tp</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-tape-brown">Tape式心理学</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-tape-orange",
                  pathname === item.href ? "text-tape-orange font-bold" : "text-tape-brown"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="text-tape-light-brown hover:text-tape-brown">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {profileName && (
              <Link
                href="/mypage"
                className="hidden md:inline-flex max-w-[180px] items-center rounded-full border border-tape-beige bg-white/80 px-4 py-1 text-sm font-semibold text-tape-brown shadow-sm"
                title="マイページへ"
              >
                <UserCircle className="mr-2 h-4 w-4" />
                <span className="truncate">{profileName}</span>
              </Link>
            )}

            <div className="flex items-center gap-2 md:hidden">
              {profileName && (
                <Link
                  href="/mypage"
                  className="max-w-[120px] truncate text-sm font-semibold text-tape-brown"
                  title="マイページへ"
                >
                  {profileName}
                </Link>
              )}
              <button
                className="p-2 text-tape-brown focus:outline-none md:hidden"
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
        <div className="md:hidden absolute top-16 left-0 w-full h-[calc(100vh-4rem)] bg-tape-cream border-b border-tape-beige shadow-lg overflow-y-auto pb-10">
          <nav className="flex flex-col p-4 space-y-2">
            {profileName && (
              <div className="flex items-center gap-3 rounded-2xl border border-tape-beige bg-white px-4 py-3 text-sm font-semibold text-tape-brown">
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
                    ? "bg-tape-orange/10 text-tape-orange"
                    : "text-tape-brown hover:bg-tape-beige"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <hr className="my-2 border-tape-beige" />
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-tape-light-brown hover:bg-tape-beige hover:text-tape-brown"
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
