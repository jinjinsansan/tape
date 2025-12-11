import { CounselorsListClient } from "./counselors-list-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function CounselorsPage() {
  return (
    <main className="min-h-screen bg-tape-cream px-4 py-12 md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-4 text-center">
          <Link href="/" className="inline-block">
            <Button variant="ghost" size="sm" className="mb-2 text-tape-brown hover:bg-tape-beige">
              <ChevronLeft className="mr-1 h-4 w-4" />
              ホームに戻る
            </Button>
          </Link>
          <p className="text-xs font-semibold tracking-[0.4em] text-tape-green">RESERVATION</p>
          <h1 className="text-3xl font-bold text-tape-brown">カウンセリング予約</h1>
          <p className="text-sm text-tape-brown/80">
            あなたの心に寄り添う専門家を選んでください。<br className="hidden sm:inline" />
            初回はチャットでの相談も可能です。
          </p>
        </header>

        <section className="space-y-6">
          <CounselorsListClient />
        </section>
      </div>
    </main>
  );
}
