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
            <Button variant="ghost" size="sm" className="mb-2">
              <ChevronLeft className="mr-1 h-4 w-4" />
              ホームに戻る
            </Button>
          </Link>
          <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">TAPE COUNSELOR</p>
          <h1 className="text-3xl font-bold text-tape-brown">Tape認定カウンセラー</h1>
          <p className="text-sm text-tape-brown/80">
            感情整理〜セルフケアまで伴走するプロフェッショナルをご紹介します。
          </p>
        </header>

        <section className="rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
          <CounselorsListClient />
        </section>
      </div>
    </main>
  );
}
