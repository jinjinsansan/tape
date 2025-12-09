import { DiaryDashboard } from "./diary-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthGate } from "@/components/auth-gate";
import Link from "next/link";
import { ChevronLeft, BookOpenCheck, LineChart, Sparkles, Layers } from "lucide-react";

const resourceLinks = [
  {
    title: "かんじょうにっきの使い方",
    description: "動画と図解で3ステップの書き方を確認",
    href: "/diary/how-to",
    icon: Sparkles
  },
  {
    title: "最初にやること",
    description: "自己肯定感・無価値感の初期スコアを計測",
    href: "/diary/first-steps",
    icon: BookOpenCheck
  },
  {
    title: "次にやること",
    description: "毎日の感情の分類とスコア調整のコツ",
    href: "/diary/next-steps",
    icon: Layers
  },
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
  },
  {
    title: "無価値感の推移",
    description: "スコアのグラフと感情の傾向をチェック",
    href: "/diary/worthlessness",
    icon: LineChart
  }
];

export default function DiaryPage() {
  return (
    <AuthGate>
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

      <main className="mx-auto max-w-5xl space-y-10">
        <section className="grid gap-4 md:grid-cols-2">
          {resourceLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="border-none bg-white/70 backdrop-blur shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="rounded-2xl bg-tape-beige p-3 text-tape-brown">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-tape-brown">{item.title}</h3>
                    <p className="mt-1 text-sm text-tape-light-brown">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        <DiaryDashboard />
      </main>
    </div>
    </AuthGate>
  );
}
