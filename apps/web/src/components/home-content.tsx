"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentType, type SVGProps } from "react";
import { createSupabaseBrowserClient } from "@tape/supabase";
import {
  BookHeart,
  Bot,
  CalendarHeart,
  ExternalLink,
  FileText,
  Globe,
  LineChart,
  LogOut,
  MessageCircle,
  PlayCircle,
  Radio,
  Settings,
  Sparkles,
  UserCircle,
  Users,
  Youtube
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SITE_NAME_EN, SITE_NAME_JP, SITE_TITLE_FONT_CLASS } from "@/lib/branding";
import type { NamisapoNewsItem } from "@/lib/namisapo";
import { cn } from "@/lib/utils";

type ShortcutCategory = "primary" | "social" | "admin";
type PrivilegedRole = "admin" | "counselor";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type AppShortcut = {
  title: string;
  subtitle: string;
  href: string;
  icon: IconComponent;
  bubbleClass: string;
  category: ShortcutCategory;
  isExternal?: boolean;
  badge?: string;
  requiresRole?: PrivilegedRole[];
  actionType?: "signout";
};

type HomeContentProps = {
  newsItems: NamisapoNewsItem[];
  viewerRole: string | null;
};

const APP_SHORTCUTS: AppShortcut[] = [
  {
    title: "感情日記",
    subtitle: "今の気持ちを3分で整理",
    href: "/diary",
    icon: BookHeart,
    bubbleClass: "bg-[#fdeef1] text-[#e53564]",
    category: "primary"
  },
  {
    title: "日記補助AI",
    subtitle: "ミシェルが下書きを提案",
    href: "/diary/assistant",
    icon: Sparkles,
    bubbleClass: "bg-[#fff4f8] text-[#d9488b]",
    category: "primary"
  },
  {
    title: "自己肯定感テスト",
    subtitle: "テープ式スコア診断",
    href: "/self-esteem",
    icon: Sparkles,
    bubbleClass: "bg-[#eef7ff] text-[#5271ff]",
    category: "primary"
  },
  {
    title: "無価値感推移グラフ",
    subtitle: "スコアの変化を見る",
    href: "/diary/worthlessness",
    icon: LineChart,
    bubbleClass: "bg-[#f4f1ff] text-[#7b4ae2]",
    category: "primary"
  },
  {
    title: "ミシェルAI",
    subtitle: "1分で相談する",
    href: "/michelle",
    icon: Bot,
    bubbleClass: "bg-[#eef7f3] text-[#1c8f65]",
    category: "primary"
  },
  {
    title: "動画コース",
    subtitle: "テープ式心理学を学ぶ",
    href: "/courses",
    icon: PlayCircle,
    bubbleClass: "bg-[#fff0e7] text-[#b06a3b]",
    category: "primary"
  },
  {
    title: "カウンセリング予約",
    subtitle: "専門家と話す",
    href: "/counselor",
    icon: CalendarHeart,
    bubbleClass: "bg-[#f8f1e8] text-[#ca5a58]",
    category: "primary"
  },
  {
    title: "みんなの日記",
    subtitle: "公開日記を読む",
    href: "/feed",
    icon: Users,
    bubbleClass: "bg-[#f3eee7] text-[#946c4c]",
    category: "primary"
  },
  {
    title: "ライブ勉強会",
    subtitle: "毎週月曜20:00",
    href: "/live",
    icon: Radio,
    bubbleClass: "bg-[#ffe7f1] text-[#d72670]",
    category: "primary"
  },
  {
    title: "マイページ",
    subtitle: "プロフィール・通知設定",
    href: "/mypage",
    icon: UserCircle,
    bubbleClass: "bg-[#eef3ff] text-[#3f5fb0]",
    category: "primary"
  },
  {
    title: "ログアウト",
    subtitle: "セッションを終了",
    href: "#logout",
    icon: LogOut,
    bubbleClass: "bg-[#fff0f0] text-[#c62828]",
    category: "primary",
    actionType: "signout"
  },
  {
    title: "公式サイト",
    subtitle: "協会ニュースはこちら",
    href: "https://web.namisapo.com/",
    icon: Globe,
    bubbleClass: "bg-[#eef3ff] text-[#3556c6]",
    category: "social",
    isExternal: true
  },
  {
    title: "YouTube",
    subtitle: "ライブ配信を見る",
    href: "https://www.youtube.com/@namisapo/streams",
    icon: Youtube,
    bubbleClass: "bg-[#fff1f0] text-[#f02d2d]",
    category: "social",
    isExternal: true
  },
  {
    title: "X",
    subtitle: "最新の活動速報",
    href: "https://x.com/iamthataru",
    icon: XLogoIcon,
    bubbleClass: "bg-[#e7f5ff] text-[#1d9bf0]",
    category: "social",
    isExternal: true
  },
  {
    title: "公式LINE",
    subtitle: "限定通知を受け取る",
    href: "https://lin.ee/xwy2PhU",
    icon: MessageCircle,
    bubbleClass: "bg-[#e6faec] text-[#15b159]",
    category: "social",
    isExternal: true
  },
  {
    title: "テープ式心理学 note",
    subtitle: "最新記事を読む",
    href: "https://note.com/namisapo",
    icon: FileText,
    bubbleClass: "bg-[#f3eefc] text-[#6b3fbf]",
    category: "social",
    isExternal: true
  },
  {
    title: "管理者パネル",
    subtitle: "管理者＆カウンセラー専用",
    href: "/admin",
    icon: Settings,
    bubbleClass: "bg-[#f2efff] text-[#6557d2]",
    category: "admin",
    badge: "ADMIN",
    requiresRole: ["admin", "counselor"]
  }
];

const SHORTCUT_SECTIONS: { id: ShortcutCategory; title: string }[] = [
  {
    id: "primary",
    title: "Tapeアプリメニュー"
  },
  {
    id: "social",
    title: "公式アカウント・情報発信"
  },
  {
    id: "admin",
    title: "管理メニュー"
  }
];

const normalizePrivilegedRole = (role: string | null): PrivilegedRole | null => {
  if (role === "admin" || role === "counselor") {
    return role;
  }
  return null;
};

const canAccessShortcut = (shortcut: AppShortcut, role: PrivilegedRole | null) => {
  if (!shortcut.requiresRole) return true;
  if (!role) return false;
  return shortcut.requiresRole.includes(role);
};

export function HomeContent({ newsItems, viewerRole }: HomeContentProps) {
  const privilegedRole = normalizePrivilegedRole(viewerRole);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#fffaf4] via-[#f9f4ff] to-[#f2fbff]">
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 pb-12 pt-6 text-center md:px-8">
        <header className="space-y-4">
          <p className="font-sans text-sm font-medium tracking-[0.4em] text-[#b29f95]">{SITE_NAME_EN}</p>
          <h1 className={cn("text-4xl md:text-5xl text-[#51433c]", SITE_TITLE_FONT_CLASS)}>{SITE_NAME_JP}</h1>
        </header>

        <div className="space-y-8 text-left">
          {SHORTCUT_SECTIONS.map((section) => {
            const shortcuts = APP_SHORTCUTS.filter(
              (shortcut) => shortcut.category === section.id && canAccessShortcut(shortcut, privilegedRole)
            );

            if (shortcuts.length === 0) {
              return null;
            }

            return (
              <section key={section.id} className="space-y-3">
                <div className="text-center text-xs font-semibold uppercase tracking-[0.4em] text-[#b29f95] md:text-left">
                  {section.title}
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {shortcuts.map((shortcut) => (
                    <AppTile key={shortcut.title} {...shortcut} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="space-y-6">
          <section className="rounded-4xl border border-[#f0e4d8] bg-white/90 p-6 text-left shadow-[0_18px_38px_rgba(81,67,60,0.04)]">
            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#b29f95]">協会ニュース</p>
              <h2 className={cn("text-2xl text-[#51433c]", SITE_TITLE_FONT_CLASS)}>最近の協会活動実績</h2>
              <p className="text-sm text-[#8b7a71]">詳しくは公式サイトをご確認ください。</p>
            </header>
            <div className="mt-4 divide-y divide-[#f0e4d8]">
              {(!newsItems || newsItems.length === 0) && (
                <p className="py-6 text-sm text-[#8b7a71]">最新のお知らせは協会サイトでご確認ください。</p>
              )}
              {newsItems?.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col gap-2 py-4 transition hover:text-[#b06a3b]"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#8b7a71]">
                    <span>{item.dateText || formatDate(item.isoDate)}</span>
                    {item.category && (
                      <span className="rounded-full border border-[#ffe3c7] px-3 py-0.5 text-[11px] text-[#b06a3b]">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-base font-medium text-[#51433c]">{item.title}</p>
                </a>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Link
                href="https://web.namisapo.com/?post_type=news"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#b06a3b]"
              >
                協会サイトでもっと見る
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          <section className="rounded-4xl border border-[#f0e4d8] bg-gradient-to-r from-rose-100/80 via-amber-50 to-sky-100/80 p-6 text-left shadow-[0_22px_45px_rgba(95,59,31,0.08)]">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#b06a3b]">週次ライブ</p>
              <div>
                <p className="text-sm font-semibold text-[#b06a3b]">毎週月曜 20:00｜無料ライブ勉強会</p>
                <h2 className={cn("mt-2 text-2xl text-[#513c32]", SITE_TITLE_FONT_CLASS)}>テープ式心理学を“実例で”学べます（質問もOK）</h2>
              </div>
              <p className="text-sm text-[#8b7a71]">
                リアルタイムでテープ式心理学のケーススタディを紹介しながら、いただいた質問にもその場でお答えします。
              </p>
              <div>
                <Link
                  href="/live"
                  className="inline-flex items-center justify-center rounded-full bg-[#e53564] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#e53564]/40 transition hover:-translate-y-0.5 hover:bg-[#c92d58]"
                >
                  勉強会の詳細を見る
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

type AppTileProps = AppShortcut;

const AppTile = ({ title, subtitle, icon: Icon, bubbleClass, href, isExternal, badge, actionType }: AppTileProps) => {
  const router = useRouter();
  const [actionPending, setActionPending] = useState(false);
  const wrapperClass =
    "group block h-full rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4d8c4] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
  const subtitleText = actionType === "signout" && actionPending ? "ログアウト中..." : subtitle;

  const content = (
    <div className={cn(
      "relative flex h-full flex-col items-center justify-between rounded-3xl border border-[#f0e4d8] bg-white/95 p-4 text-center shadow-[0_12px_30px_rgba(81,67,60,0.08)] transition-all",
      actionType !== "signout" && "group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_rgba(81,67,60,0.15)]"
    )}>
      {badge && (
        <span className="absolute right-3 top-3 rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-semibold text-[#a05824]">
          {badge}
        </span>
      )}
      <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl text-lg", bubbleClass)}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#513c32]">{title}</p>
        <p className="text-xs leading-tight text-[#8b7a71]">{subtitleText}</p>
      </div>
    </div>
  );

  if (actionType === "signout") {
    const handleSignOut = async () => {
      if (actionPending) return;
      setActionPending(true);
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.refresh();
      } finally {
        setActionPending(false);
      }
    };

    return (
      <button
        type="button"
        onClick={handleSignOut}
        className={cn(wrapperClass, actionPending && "cursor-not-allowed opacity-80")}
        disabled={actionPending}
      >
        {content}
      </button>
    );
  }

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={wrapperClass}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={wrapperClass}>
      {content}
    </Link>
  );
};

const formatDate = (isoDate?: string) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};

function XLogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4l7.5 7.5L4 20h4l4.5-5 4 5H20l-6.5-7.5L20 4h-4l-4 4.5L8 4H4z" />
    </svg>
  );
}
