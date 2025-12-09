import { Sparkles, PenLine, Target, Lightbulb, CheckCircle2, PlayCircle } from "lucide-react";
import Link from "next/link";

const goals = [
  {
    title: "自己肯定感を育てる",
    body: "無価値感を数値化しつつ言語化することで変化を確認します。",
    accent: "from-tape-cream to-white border-tape-beige"
  },
  {
    title: "気づきを促す",
    body: "出来事→意味づけ→感情という3つの視点で思考の癖を把握します。",
    accent: "from-tape-green/10 to-white border-tape-green/30"
  }
];

const dailyFlow = [
  {
    step: "STEP 01",
    title: "感情をキャプチャ",
    description: "印象に残った出来事と湧いた気持ちをそのまま書き留めます。"
  },
  {
    step: "STEP 02",
    title: "意味づけを言語化",
    description: "なぜそう感じたのかを追跡し、心の方程式を見つけます。"
  },
  {
    step: "STEP 03",
    title: "スコア入力",
    description: "自己肯定感と無価値感を 0-100 で記録し、推移を可視化します。"
  }
];

const tips = [
  { icon: Target, title: "目的をセット", body: "" + "何のために記録するのか冒頭に書くと迷いません。" },
  { icon: Lightbulb, title: "内側に問いかける", body: "原因を内側に探すことで新しい気づきが生まれます。" },
  { icon: CheckCircle2, title: "小さな称賛", body: "書き終えたら一言自分を褒めると習慣化しやすくなります。" }
];

export default function HowToPage() {
  return (
    <div className="min-h-screen bg-tape-cream px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-10">
        <Link href="/diary" className="text-sm text-tape-light-brown hover:text-tape-brown">
          ← かんじょうにっきトップへ戻る
        </Link>

        <section className="rounded-[32px] bg-white shadow-lg ring-1 ring-tape-beige/60">
          <div className="grid gap-10 p-8 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="inline-flex items-center rounded-full bg-tape-pink/10 px-4 py-1 text-xs font-semibold text-tape-pink">
                <Sparkles className="mr-2 h-4 w-4" /> かんじょうにっきの使い方
              </p>
              <h1 className="text-3xl font-bold text-tape-brown">3分の心のメンテナンスで無価値感を手放す</h1>
              <p className="text-sm text-tape-light-brown">
                Google ログインだけですぐに記録でき、サポートプランでは専門家のフィードバックも受け取れます。
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {goals.map((goal) => (
                  <div key={goal.title} className={`rounded-2xl border px-4 py-3 bg-gradient-to-b ${goal.accent}`}>
                    <h2 className="text-base font-semibold text-tape-brown">{goal.title}</h2>
                    <p className="mt-1 text-sm text-tape-light-brown">{goal.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-r from-tape-pink/30 to-tape-orange/20 blur-3xl" />
              <div className="rounded-[28px] border border-white bg-white shadow-2xl">
                <iframe
                  title="使い方動画"
                  src="https://www.youtube.com/embed/uZtJ8tQFKuM"
                  className="aspect-video w-full rounded-[28px]"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-tape-light-brown">
                  <PlayCircle className="h-4 w-4 text-tape-orange" /> チュートリアル動画を見る
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] bg-tape-brown text-white p-8 space-y-6">
          <div className="flex items-center gap-3">
            <PenLine className="h-8 w-8" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Daily Flow</p>
              <h2 className="text-2xl font-semibold">1エントリーの流れ</h2>
            </div>
          </div>
          <div className="space-y-6">
            {dailyFlow.map((item, index) => (
              <div key={item.title} className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4 sm:flex-row sm:items-center">
                <div className="text-sm text-white/60 sm:w-24">{item.step}</div>
                <div className="flex-1">
                  <p className="text-lg font-semibold">0{index + 1}. {item.title}</p>
                  <p className="text-sm text-white/80">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-8 shadow-lg ring-1 ring-tape-beige/50 space-y-6">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-tape-brown" />
            <div>
              <p className="text-xs font-semibold text-tape-light-brown">TIPS</p>
              <h2 className="text-2xl font-bold text-tape-brown">続けるためのヒント</h2>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {tips.map((tip) => (
              <div key={tip.title} className="rounded-2xl border border-tape-beige bg-tape-cream/60 p-6">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-tape-brown">
                  <tip.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-tape-brown">{tip.title}</h3>
                <p className="mt-2 text-sm text-tape-light-brown">{tip.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
