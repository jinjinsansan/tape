import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { buildDiaryShareText } from "@/lib/diary-share";
import { getPublicFeedEntryById } from "@/server/services/feed";

type SharePageProps = {
  params: { entryId: string };
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

const clippedPreview = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
};

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const entry = await getPublicFeedEntryById(params.entryId).catch(() => null);
  if (!entry || !entry.isShareable) {
    return {
      title: "日記が見つかりません",
      description: "公開シェア用の日記が見つかりませんでした。"
    };
  }

  const ogImageUrl = `${appUrl}/api/feed/${params.entryId}/og-image`;
  const shareUrl = `${appUrl}/feed/${params.entryId}/share`;
  const description = clippedPreview(entry.content.replace(/\s+/g, " "));
  const title = `${entry.author.displayName ?? "匿名ユーザー"}さんの公開日記`;

  return {
    title,
    description,
    openGraph: {
      type: "article",
      url: shareUrl,
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl]
    }
  };
}

export default async function FeedShareLandingPage({ params }: SharePageProps) {
  const entry = await getPublicFeedEntryById(params.entryId);
  if (!entry || !entry.isShareable) {
    notFound();
  }

  const shareTemplate = buildDiaryShareText({
    title: entry.title,
    snippet: clippedPreview(entry.content),
    moodLabel: entry.moodLabel,
    feelings: entry.feelings.map((feeling) => feeling.label),
    journalDate: entry.journalDate
  });

  return (
    <main className="min-h-screen bg-tape-cream px-4 py-10 md:px-0">
      <div className="mx-auto max-w-2xl space-y-6 rounded-[32px] border border-tape-beige bg-white/90 p-6 shadow-sm">
        <header className="space-y-2 text-center">
          <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">SHARE VIEW</p>
          <h1 className="text-2xl font-bold text-tape-brown">公開日記をみんなとシェア</h1>
          <p className="text-sm text-tape-light-brown">
            このページのURLを X や LINE に貼り付けると、OGPカード付きで日記を紹介できます。
          </p>
        </header>

        <section className="rounded-3xl border border-tape-beige bg-tape-cream/40 p-5 text-sm text-tape-brown">
          <p className="text-xs font-semibold text-tape-light-brown">共有テンプレ</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-dashed border-tape-beige bg-white/80 p-4 font-mono text-[12px] leading-relaxed">
            {shareTemplate}
          </pre>
          <p className="mt-3 text-xs text-tape-light-brown">
            ご自身のメモを追記してもOKです。このページのURLを合わせて投稿してください。
          </p>
        </section>

        <section className="space-y-3 rounded-3xl border border-tape-beige bg-white/80 p-5 text-sm">
          <p className="text-xs font-semibold text-tape-light-brown">日記の抜粋</p>
          <div className="space-y-1">
            <p className="text-xs text-tape-light-brown">タイトル</p>
            <p className="text-base font-semibold text-tape-brown">{entry.title ?? "(タイトルなし)"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-tape-light-brown">本文</p>
            <p className="whitespace-pre-wrap rounded-2xl bg-tape-cream/70 p-3 text-sm leading-relaxed text-tape-brown/90">
              {entry.content}
            </p>
          </div>
          {entry.feelings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-tape-light-brown">感情タグ</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {entry.feelings.map((feeling) => (
                  <span key={`${entry.id}-${feeling.label}`} className="rounded-full bg-tape-pink/10 px-3 py-1 text-tape-brown">
                    {feeling.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3 text-sm text-tape-light-brown">
          <Link href={`/feed/${entry.id}`} className="text-center">
            <Button variant="outline" className="w-full border-tape-beige text-tape-brown">
              元の日記を読む
            </Button>
          </Link>
          <p className="text-center text-xs">
            URL をコピーして各SNSの投稿欄に貼り付けるだけで、OGPカードが自動生成されます。
          </p>
        </div>
      </div>
    </main>
  );
}
