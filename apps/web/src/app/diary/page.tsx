"use client";
import Link from "next/link";
import { ChevronLeft, BookOpenCheck, Sparkles } from "lucide-react";

import { DiaryDashboard } from "./diary-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthGate } from "@/components/auth-gate";
import { cn } from "@/lib/utils";

const resourceLinks = [
  {
    title: "感情の種類",
    description: "8つのネガティブ・4つのポジティブを整理",
    href: "/diary/emotion-types",
    icon: Sparkles
  },
  {
    title: "過去の日記",
    description: "検索・フィルタでこれまでの気持ちを振り返り",
    href: "/diary/history",
    icon: BookOpenCheck
  }
];

export default function DiaryPage() {
  return (
    <AuthGate>
      <div className="min-h-screen p-4 pb-20 md:p-8">
      <header className="mx-auto mb-8 max-w-4xl space-y-4 text-center">
        <Link href="/" className="inline-block">
          <Button variant="ghost" size="sm" className="mb-2">
            <ChevronLeft className="mr-1 h-4 w-4" />
            ホームに戻る
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-[#51433c]">かんじょうにっき</h1>
        <p className="text-[#8b7a71]">
          今の気持ちをそのまま書き出してみましょう。<br />
          書くことで、少しだけ心が軽くなるかもしれません。
        </p>
      </header>

      <main className="mx-auto max-w-5xl space-y-10">
        <section className="rounded-3xl border border-[#f0e4d8] bg-white/95 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d59da9]">
                DAILY TEST
              </p>
              <h2 className="mt-1 text-2xl font-bold text-[#51433c]">自己肯定感スコアテスト</h2>
              <p className="mt-1 text-sm text-[#8b7a71]">
                ネガティブ設問5問に答えて、今日の自己肯定感と無価値感を1分で数値化。日記に自動で下書きをつくれます。
              </p>
            </div>
            <Link href="/diary/self-esteem-test" className="inline-flex">
              <Button className="w-full rounded-full bg-tape-pink px-6 py-3 text-white shadow-md hover:bg-tape-pink/90" size="lg">
                今日のテストを受ける
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {resourceLinks.map((item) => {
            const cardClasses = cn(
              "border border-[#f0e4d8] bg-white/95 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            );

            return (
              <Link key={item.href} href={item.href}>
                <Card className={cardClasses}>
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="rounded-2xl bg-[#fff3eb] p-3 text-[#51433c]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#51433c]">{item.title}</h3>
                    <p className="mt-1 text-sm text-[#8b7a71]">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
              </Link>
            );
          })}
        </section>

        <DiaryDashboard />
      </main>
    </div>
    </AuthGate>
  );
}
