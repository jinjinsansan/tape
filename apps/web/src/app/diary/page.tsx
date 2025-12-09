import { DiaryDashboard } from "./diary-dashboard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function DiaryPage() {
  return (
    <div className="min-h-screen bg-tape-cream p-4 pb-20 md:p-8">
      <header className="mx-auto mb-8 max-w-4xl space-y-4 text-center">
        <Link href="/" className="inline-block">
          <Button variant="ghost" size="sm" className="mb-2">
            <ChevronLeft className="mr-1 h-4 w-4" />
            ホームに戻る
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-tape-brown">かんじょうにっき</h1>
        <p className="text-tape-light-brown">
          今の気持ちをそのまま書き出してみましょう。<br />
          書くことで、少しだけ心が軽くなるかもしれません。
        </p>
      </header>

      <main className="mx-auto max-w-4xl">
        <DiaryDashboard />
      </main>
    </div>
  );
}
