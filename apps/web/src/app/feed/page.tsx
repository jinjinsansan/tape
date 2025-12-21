import { FeedPageClient } from "./feed-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function FeedPage() {
  return (
    <div className="bg-gradient-to-b from-[#fffaf4] via-[#f8f3ff] to-[#f3fbff]">
      <main className="min-h-screen px-4 py-12 md:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <header className="space-y-4 text-center">
            <Link href="/" className="inline-block">
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 rounded-full border border-[#f0e4d8] bg-white/80 text-[#51433c] hover:bg-white"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                ホームに戻る
              </Button>
            </Link>
            <p className="text-xs font-semibold tracking-[0.4em] text-[#92b4d6]">MINNA NO NIKKI</p>
            <h1 className="text-3xl font-bold text-[#51433c]">みんなの日記</h1>
            <p className="text-sm text-[#8b7a71]">公開された日記から気づきを共有しあう場所です。</p>
          </header>

          <FeedPageClient />
        </div>
      </main>
    </div>
  );
}
