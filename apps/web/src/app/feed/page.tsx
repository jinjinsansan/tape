import { FeedPageClient } from "./feed-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function FeedPage() {
  return (
    <main className="min-h-screen bg-tape-cream px-4 py-12 md:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-4 text-center">
          <Link href="/" className="inline-block">
            <Button variant="ghost" size="sm" className="mb-2">
              <ChevronLeft className="mr-1 h-4 w-4" />
              ホームに戻る
            </Button>
          </Link>
          <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">MINNA NO NIKKI</p>
          <h1 className="text-3xl font-bold text-tape-brown">みんなの日記</h1>
          <p className="text-sm text-tape-brown/80">公開された日記から気づきを共有しあう場所です。</p>
        </header>

        <FeedPageClient />
      </div>
    </main>
  );
}
