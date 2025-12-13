"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, BookOpenCheck, LineChart, Sparkles } from "lucide-react";

import { DiaryDashboard } from "./diary-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthGate } from "@/components/auth-gate";
import { cn } from "@/lib/utils";

const resourceLinks = [
  {
    title: "かんじょうにっきの使い方",
    description: "書き方・初期診断・毎日のコツを1ページで確認",
    href: "/diary/how-to",
    icon: Sparkles
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
  const [needsAssessment, setNeedsAssessment] = useState(false);
  const [checkedAssessment, setCheckedAssessment] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/diary/initial-score", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("failed to load score");
        }
        const data = await res.json();
        if (!active) return;
        setNeedsAssessment(!data.initialScore);
      } catch (error) {
        if (!active) return;
        setNeedsAssessment(false);
      } finally {
        if (active) {
          setCheckedAssessment(true);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const highlightHowTo = checkedAssessment && needsAssessment;

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
          {resourceLinks.map((item) => {
            const isHowTo = item.href === "/diary/how-to";
            const cardClasses = cn(
              "border-none bg-white/70 backdrop-blur shadow-sm transition-all hover:-translate-y-1 hover:shadow-md",
              isHowTo && highlightHowTo && "ring-2 ring-tape-pink shadow-lg animate-pulse"
            );

            return (
              <Link key={item.href} href={item.href}>
                <Card className={cardClasses}>
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
            );
          })}
        </section>

        <DiaryDashboard />
      </main>
    </div>
    </AuthGate>
  );
}
