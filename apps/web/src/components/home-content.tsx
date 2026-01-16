"use client";

import Link from "next/link";
import { BookHeart, Bot, CalendarHeart, ExternalLink, PlayCircle, Settings, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { SignOutButton } from "@/components/signout-button";
import { SiteFooter } from "@/components/site-footer";
import { SITE_NAME_EN, SITE_NAME_JP } from "@/lib/branding";
import type { NamisapoBlogPost, NamisapoNewsItem } from "@/lib/namisapo";

type HomeContentProps = {
  newsItems: NamisapoNewsItem[];
  blogPosts: NamisapoBlogPost[];
};

export function HomeContent({ newsItems, blogPosts }: HomeContentProps) {
  const features = [
    {
      title: "感情日記",
      description: "今の気持ちを書き留める",
      icon: BookHeart,
      href: "/diary",
      color: "bg-[#fdeef1] text-[#51433c]",
    },
    {
      title: "ミシェルAI",
      descriptionLines: ["1分でミシェルに相談する", "気遣いゼロで、今のつらさを1分で言語化します"],
      icon: Bot,
      href: "/michelle",
      color: "bg-[#eef7f3] text-[#51433c]",
    },
    {
      title: "動画コース",
      description: "心の仕組みを学ぶ",
      icon: PlayCircle,
      href: "/courses",
      color: "bg-[#fff0e7] text-[#51433c]",
    },
    {
      title: "カウンセリング",
      description: "専門家に相談する",
      icon: CalendarHeart,
      href: "/counselor",
      color: "bg-[#f8f1e8] text-[#51433c]",
    },
    {
      title: "みんなの日記",
      description: "公開された日記を読む",
      icon: Users,
      href: "/feed",
      color: "bg-[#f3eee7] text-[#51433c]",
    },
    {
      title: "管理者メニュー",
      description: "システム設定",
      icon: Settings,
      href: "/admin",
      color: "bg-[#f2efff] text-[#51433c]",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-10 p-4 text-center md:p-8">
        <div className="flex justify-end">
          <SignOutButton />
        </div>
        <div className="space-y-4">
          <p className="font-sans text-sm font-medium tracking-[0.4em] text-[#b29f95]">{SITE_NAME_EN}</p>
          <h1 className="font-sans text-4xl font-bold tracking-tight text-[#51433c] md:text-5xl">{SITE_NAME_JP}</h1>
          <p className="mx-auto max-w-md text-lg text-[#8b7a71]">
            あなたの心にそっと寄り添う、<br className="md:hidden" />
            やさしい居場所。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href}>
              <Card className="h-full border border-[#f0e4d8] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="flex flex-col items-center justify-center space-y-3 p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${feature.color}`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-tape-brown">{feature.title}</h3>
                    {Array.isArray(feature.descriptionLines) ? (
                      <div className="text-xs text-tape-light-brown">
                        {feature.descriptionLines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-tape-light-brown">{feature.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="space-y-6">
          <section className="rounded-4xl border border-[#f0e4d8] bg-white/90 p-6 text-left shadow-[0_18px_38px_rgba(81,67,60,0.04)]">
            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#b29f95]">協会ニュース</p>
              <h2 className="text-2xl font-semibold text-[#51433c]">テープ式心理学の今</h2>
              <p className="text-sm text-[#8b7a71]">
                日記・ミシェル体験がより良い社会に繋がるよう、協会の活動をそっと紹介します。
              </p>
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

          <section className="rounded-4xl border border-[#f0e4d8] bg-white/90 p-6 text-left shadow-[0_18px_38px_rgba(81,67,60,0.04)]">
            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#b29f95]">ブログ</p>
              <h2 className="text-2xl font-semibold text-[#51433c]">テープ式心理学コラム</h2>
              <p className="text-sm text-[#8b7a71]">
                心の仕組みやセルフケアのヒントを、協会メンバーが丁寧に解説しています。
              </p>
            </header>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {(!blogPosts || blogPosts.length === 0) && (
                <p className="col-span-full py-4 text-sm text-[#8b7a71]">記事の取得に失敗しました。</p>
              )}
              {blogPosts?.map((post) => (
                <a
                  key={post.id}
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#f0e4d8] bg-[#fff8f2]"
                >
                  {post.imageUrl && (
                    <div
                      className="h-32 w-full bg-cover bg-center transition group-hover:scale-[1.01]"
                      style={{ backgroundImage: `url(${post.imageUrl})` }}
                    />
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex flex-wrap gap-2">
                      {post.categories.slice(0, 2).map((category) => (
                        <span key={category} className="rounded-full bg-[#fff1df] px-3 py-0.5 text-xs text-[#b06a3b]">
                          {category}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-[#8b7a71]">{post.dateText || formatDate(post.isoDate)}</p>
                    <h3 className="text-lg font-semibold text-[#51433c]">{post.title}</h3>
                    <p className="text-sm text-[#8b7a71]">{post.excerpt}</p>
                    <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-[#b06a3b]">
                      記事を読む
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Link
                href="https://web.namisapo.com/?page_id=39"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#b06a3b]"
              >
                記事一覧へ
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

const formatDate = (isoDate?: string) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};
