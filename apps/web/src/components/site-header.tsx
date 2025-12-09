"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X, BookHeart, Bot, PlayCircle, CalendarHeart, Users, Settings, Home } from "lucide-react";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/diary", label: "感情日記", icon: BookHeart },
  { href: "/michelle", label: "Michelle AI", icon: Bot },
  { href: "/course/beginner", label: "動画コース", icon: PlayCircle },
  { href: "/counselor", label: "カウンセリング", icon: CalendarHeart },
  { href: "/feed", label: "みんなの日記", icon: Users },
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();

  // Close menu when route changes
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

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

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-tape-brown focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full h-[calc(100vh-4rem)] bg-tape-cream border-b border-tape-beige shadow-lg overflow-y-auto pb-10">
          <nav className="flex flex-col p-4 space-y-2">
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
