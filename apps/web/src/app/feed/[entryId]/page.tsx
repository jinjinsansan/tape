import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPublicFeedEntryById } from "@/server/services/feed";

import { FeedShareButton } from "../feed-share-button";

const emotionToneMap: Record<string, string> = {
  恐怖: "bg-purple-100 text-purple-800 border-purple-200",
  悲しみ: "bg-blue-100 text-blue-800 border-blue-200",
  怒り: "bg-red-100 text-red-800 border-red-200",
  寂しさ: "bg-indigo-100 text-indigo-800 border-indigo-200",
  無価値感: "bg-gray-100 text-gray-800 border-gray-300",
  罪悪感: "bg-orange-100 text-orange-800 border-orange-200",
  悔しさ: "bg-green-100 text-green-800 border-green-200",
  恥ずかしさ: "bg-pink-100 text-pink-800 border-pink-200",
  嬉しい: "bg-yellow-100 text-yellow-800 border-yellow-200",
  感謝: "bg-teal-100 text-teal-800 border-teal-200",
  達成感: "bg-lime-100 text-lime-800 border-lime-200",
  幸せ: "bg-amber-100 text-amber-800 border-amber-200"
};

type FeedEntryPageProps = {
  params: { entryId: string };
};

export async function generateMetadata({ params }: FeedEntryPageProps): Promise<Metadata> {
  const entry = await getPublicFeedEntryById(params.entryId).catch(() => null);
  if (!entry) {
    return { title: "公開日記が見つかりません" };
  }
  const preview = entry.content.slice(0, 80).replace(/\s+/g, " ");
  return {
    title: `${entry.author.displayName ?? "匿名ユーザー"}さんの公開日記` ,
    description: preview
  };
}

export default async function FeedEntryDetailPage({ params }: FeedEntryPageProps) {
  const entry = await getPublicFeedEntryById(params.entryId);
  if (!entry) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-tape-cream px-4 py-10 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/feed">
            <Button variant="ghost" size="sm" className="text-tape-brown">
              ← みんなの日記に戻る
            </Button>
          </Link>
          {entry.isShareable && (
            <FeedShareButton
              entryId={entry.id}
              contentPreview={entry.content}
              shareCount={entry.shareCount}
              title={entry.title}
              moodLabel={entry.moodLabel}
              feelings={entry.feelings.map((feeling) => feeling.label)}
              journalDate={entry.journalDate}
            />
          )}
        </div>

        <Card className="border-tape-beige bg-white shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-[0.3em] text-tape-light-brown">PUBLIC DIARY</span>
                <h1 className="text-2xl font-bold text-tape-brown">{entry.title ?? "(タイトルなし)"}</h1>
                <p className="text-xs text-tape-light-brown">
                  {new Date(entry.publishedAt ?? entry.journalDate).toLocaleString("ja-JP")}
                </p>
              </div>
              {entry.moodLabel && (
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold",
                    emotionToneMap[entry.moodLabel] ?? "bg-gray-100 text-gray-800 border-gray-200"
                  )}
                >
                  {entry.moodLabel}
                </span>
              )}
            </div>

            {entry.eventSummary && (
              <div className="rounded-2xl border border-tape-beige bg-tape-cream/60 p-4">
                <p className="text-xs font-semibold text-tape-light-brown">出来事・状況の要約メモ</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-tape-brown">{entry.eventSummary}</p>
              </div>
            )}

            <article className="prose prose-sm max-w-none whitespace-pre-wrap text-tape-brown/90">
              {entry.content}
            </article>

            {entry.realization && (
              <div className="rounded-2xl border border-dashed border-tape-beige bg-white/80 p-4">
                <p className="text-xs font-semibold text-tape-light-brown">気づき・意味づけ</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-tape-brown">{entry.realization}</p>
              </div>
            )}

            {entry.feelings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-tape-light-brown">感情タグ</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {entry.feelings.map((feeling) => (
                    <span key={`${entry.id}-${feeling.label}`} className="rounded-full bg-tape-pink/10 px-3 py-1 text-tape-brown">
                      {feeling.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entry.aiComment && (
              <div className="rounded-2xl border border-tape-pink/30 bg-[#fff6f8] p-4 text-sm text-tape-brown">
                <p className="text-xs font-bold text-tape-pink">ミシェルAIからのコメント</p>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{entry.aiComment.content}</p>
              </div>
            )}

            {entry.counselorComment && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                <p className="text-xs font-bold">カウンセラーのコメント</p>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{entry.counselorComment.content}</p>
                <p className="mt-1 text-[11px]">— {entry.counselorComment.author}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
