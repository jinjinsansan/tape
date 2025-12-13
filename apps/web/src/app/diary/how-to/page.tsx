"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock,
  Heart,
  Lightbulb,
  Loader2,
  Minus,
  PenLine,
  PlayCircle,
  Plus,
  Sparkles,
  Target
} from "lucide-react";

type Assessment = {
  id: string;
  age_path: string;
  self_esteem_score: number;
  worthlessness_score: number;
  measured_at: string;
};

type InitialScore = {
  self_esteem_score: number;
  worthlessness_score: number;
  measured_on: string;
};

type ApiResponse = {
  assessments: Assessment[];
  latest: Assessment | null;
  initialScore: InitialScore | null;
};

const goals = [
  {
    title: "自己肯定感を育てる",
    body: "感情を言語化し、無価値感スコアの変化を追いかけます。",
    accent: "from-tape-cream to-white border-tape-beige"
  },
  {
    title: "気づきを促す",
    body: "出来事→意味づけ→感情の3ステップで思考のクセを見つめ直します。",
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
    description: "なぜそう感じたのかを追跡し、心のパターンに気づきます。"
  },
  {
    step: "STEP 03",
    title: "スコア入力",
    description: "自己肯定感と無価値感を 0-100 で記録し、推移を可視化します。"
  }
];

const tips = [
  { icon: Target, title: "目的をセット", body: "冒頭に今日のテーマを書くと意識が定まります。" },
  { icon: Lightbulb, title: "内側に問いかける", body: "感情の理由を内側に探すことで気づきが深まります。" },
  { icon: CheckCircle2, title: "小さな称賛", body: "書き終えたら一言自分を褒めて習慣化しましょう。" }
];

const negativeEmotions = ["恐怖", "悲しみ", "怒り", "寂しさ", "無価値感", "罪悪感", "悔しさ", "恥ずかしさ"];
const positiveEmotions = ["嬉しい", "感謝", "達成感", "幸せ"];

const negativeChipPalettes = [
  "from-rose-100 to-orange-100 text-rose-900 border-rose-200",
  "from-purple-100 to-indigo-100 text-purple-900 border-purple-200",
  "from-red-100 to-amber-100 text-red-900 border-red-200",
  "from-sky-100 to-cyan-100 text-sky-900 border-sky-200"
];

const positiveChipPalettes = [
  "from-emerald-100 to-lime-100 text-emerald-900 border-emerald-200",
  "from-yellow-100 to-amber-100 text-yellow-900 border-yellow-200",
  "from-pink-100 to-rose-100 text-pink-900 border-pink-200",
  "from-teal-100 to-cyan-100 text-teal-900 border-teal-200"
];

const formatDate = (input: string) => {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
};

export default function HowToPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [initialScore, setInitialScore] = useState<InitialScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/diary/self-assessments?limit=5", { cache: "no-store" });
        if (res.status === 401) {
          setAssessments([]);
          setInitialScore(null);
          setError(null);
          return;
        }
        if (!res.ok) {
          throw new Error("診断履歴の取得に失敗しました");
        }
        const data: ApiResponse = await res.json();
        setAssessments(data.assessments ?? []);
        setInitialScore(data.initialScore ?? null);
      } catch (err) {
        console.error(err);
        setError("診断履歴の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const latest = assessments[0] ?? null;
  const firstRecord = useMemo(() => (assessments.length ? assessments[assessments.length - 1] : null), [assessments]);

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
              <h1 className="text-3xl font-bold text-tape-brown">感情の変化を記録して、心の動きを見える化</h1>
              <p className="text-sm text-tape-light-brown">
                毎日3分で、出来事と感情を整理しながら自己肯定感を育てるためのガイドです。
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
                  <PlayCircle className="h-4 w-4 text-tape-orange" /> 使い方を動画で見る
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-8 shadow-lg ring-1 ring-tape-beige/50 space-y-6">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-tape-brown" />
            <div>
              <p className="text-xs font-semibold text-tape-light-brown">FLOW</p>
              <h2 className="text-2xl font-bold text-tape-brown">1エントリーの流れ</h2>
            </div>
          </div>
          <div className="space-y-6">
            {dailyFlow.map((item, index) => (
              <div key={item.title} className="flex flex-col gap-2 rounded-2xl bg-tape-cream/60 p-4 sm:flex-row sm:items-center">
                <div className="text-sm text-tape-light-brown sm:w-24">{item.step}</div>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-tape-brown">0{index + 1}. {item.title}</p>
                  <p className="text-sm text-tape-light-brown">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-tape-beige/60 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-tape-pink tracking-[0.3em]">FIRST STEP</p>
              <h2 className="text-2xl font-bold text-tape-brown">まずは現在地を測る</h2>
              <p className="mt-2 text-sm text-tape-light-brown">
                自己肯定感と無価値感の診断で今の状態を記録すると、以降のグラフがより正確になります。
              </p>
            </div>
            <Link
              href="/diary/first-steps/assessment"
              className="inline-flex items-center rounded-full bg-tape-brown px-6 py-3 text-sm font-semibold text-white hover:bg-tape-brown/90"
            >
              診断する
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-tape-beige bg-tape-cream/60 p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-tape-brown" />
                <p className="text-sm font-semibold text-tape-brown">最新の診断結果</p>
              </div>
              {loading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-tape-light-brown">
                  <Loader2 className="h-4 w-4 animate-spin" /> 読み込み中...
                </div>
              ) : error ? (
                <p className="mt-4 text-sm text-tape-pink">{error}</p>
              ) : latest ? (
                <div className="mt-4 space-y-2 text-sm text-tape-brown">
                  <p className="text-xs text-tape-light-brown">{formatDate(latest.measured_at)}</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold">自己肯定感 {latest.self_esteem_score}</span>
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold">無価値感 {latest.worthlessness_score}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-tape-light-brown">まだ診断を行っていません。</p>
              )}
            </div>

            <div className="rounded-2xl border border-tape-beige bg-white/70 p-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-tape-brown" />
                <p className="text-sm font-semibold text-tape-brown">一番最初の診断</p>
              </div>
              {firstRecord ? (
                <div className="mt-4 space-y-2 text-sm text-tape-brown">
                  <p className="text-xs text-tape-light-brown">{formatDate(firstRecord.measured_at)}</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-tape-cream px-4 py-2 text-sm font-semibold">自己肯定感 {firstRecord.self_esteem_score}</span>
                    <span className="rounded-full bg-tape-cream px-4 py-2 text-sm font-semibold">無価値感 {firstRecord.worthlessness_score}</span>
                  </div>
                </div>
              ) : initialScore ? (
                <div className="mt-4 space-y-2 text-sm text-tape-brown">
                  <p className="text-xs text-tape-light-brown">{formatDate(initialScore.measured_on)}</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-tape-cream px-4 py-2 text-sm font-semibold">自己肯定感 {initialScore.self_esteem_score}</span>
                    <span className="rounded-full bg-tape-cream px-4 py-2 text-sm font-semibold">無価値感 {initialScore.worthlessness_score}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-tape-light-brown">診断を行うと、ここに初回記録が表示されます。</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-tape-beige bg-white/80 p-4 text-sm text-tape-brown">
            <div className="flex items-center gap-2 text-tape-light-brown">
              <Sparkles className="h-4 w-4" />
              <span>診断結果は無価値感グラフの起点になり、次に「無価値感」で日記を書いた日の前日のスコアとして使用されます。</span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-tape-beige/60">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-tape-brown">診断履歴</h2>
              <p className="text-sm text-tape-light-brown">直近5件まで表示しています。</p>
            </div>
            <Link
              href="/diary/first-steps/assessment"
              className="text-sm font-semibold text-tape-brown underline decoration-tape-brown/40"
            >
              診断する
            </Link>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-tape-light-brown">
              <Loader2 className="h-4 w-4 animate-spin" /> 読み込み中...
            </div>
          ) : error ? (
            <p className="mt-6 text-sm text-tape-pink">{error}</p>
          ) : assessments.length === 0 ? (
            <p className="mt-6 text-sm text-tape-light-brown">まだ記録がありません。診断を行って初期スコアを作成しましょう。</p>
          ) : (
            <div className="mt-6 space-y-3">
              {assessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex flex-wrap items-center justify-between rounded-2xl border border-tape-beige bg-tape-cream/60 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-tape-brown">{formatDate(assessment.measured_at)}</p>
                    <p className="text-xs text-tape-light-brown">
                      ルート: {assessment.age_path === "teen" ? "10代向け" : assessment.age_path === "adult" ? "20〜50代向け" : "60代以上向け"}
                    </p>
                  </div>
                  <div className="flex gap-3 text-tape-brown">
                    <span className="rounded-full bg-white px-3 py-1 font-semibold">自己肯定感 {assessment.self_esteem_score}</span>
                    <span className="rounded-full bg-white px-3 py-1 font-semibold">無価値感 {assessment.worthlessness_score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white/90 p-6 shadow-2xl ring-1 ring-tape-beige/60 space-y-8">
          <div className="text-center">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-tape-pink/10 px-4 py-1 text-xs font-semibold text-tape-pink">
              <Sparkles className="h-4 w-4" /> 次のステップ
            </p>
            <h2 className="mt-3 text-3xl font-bold text-tape-brown">感情タグとスコア調整のコツ</h2>
            <p className="mt-2 text-sm text-tape-light-brown">翌日以降の記録で迷ったら、この図を参考に気持ちを整理してください。</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-tape-brown/20 bg-gradient-to-br from-tape-brown/5 via-white to-tape-beige/60 p-5">
              <h3 className="text-lg font-semibold text-center text-tape-brown">8つのネガティブな感情</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {negativeEmotions.map((emotion, index) => (
                  <span
                    key={emotion}
                    className={`rounded-2xl border bg-gradient-to-r px-4 py-2 text-center font-semibold shadow-sm ${negativeChipPalettes[index % negativeChipPalettes.length]}`}
                  >
                    {emotion}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-tape-green/30 bg-gradient-to-br from-tape-green/10 via-white to-tape-cream/70 p-5">
              <h3 className="text-lg font-semibold text-center text-tape-brown">4つのポジティブな感情</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {positiveEmotions.map((emotion, index) => (
                  <span
                    key={emotion}
                    className={`rounded-2xl border bg-gradient-to-r px-4 py-2 text-center font-semibold shadow-sm ${positiveChipPalettes[index % positiveChipPalettes.length]}`}
                  >
                    {emotion}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-tape-pink/30 bg-gradient-to-br from-tape-pink/10 via-white to-tape-orange/10 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-tape-pink shadow">
                  <Heart className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-tape-brown">無価値感を選んだときのスコア入力</h3>
                  <p className="text-sm text-tape-light-brown">無価値感やポジティブ感情を選んだ場合は、自己肯定感/無価値感スコアを手動で調整します。</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-tape-green/30 bg-white/80 p-4 shadow-sm">
                  <Plus className="h-5 w-5 text-tape-green" />
                  <span className="text-sm text-tape-brown">自己肯定感が上がった → 自己肯定感スコアを上げ、無価値感スコアを下げる</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-tape-pink/30 bg-white/80 p-4 shadow-sm">
                  <Minus className="h-5 w-5 text-tape-pink" />
                  <span className="text-sm text-tape-brown">自己肯定感が下がった → 自己肯定感スコアを下げ、無価値感スコアを上げる</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-tape-brown/30 bg-gradient-to-br from-tape-purple/10 via-white to-tape-cream p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-tape-brown shadow">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-tape-brown">毎日続けると見えてくること</h3>
                  <p className="text-sm text-tape-light-brown">無価値感の上下は自己肯定感の上下と連動しています。ポジティブな感情も丁寧に記録して、上がった理由も見つけましょう。</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  "感じた感情をまず受け止める",
                  "意味づけを言葉にする",
                  "スコアで変化を見える化"
                ].map((tip) => (
                  <div key={tip} className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-xs font-semibold text-tape-brown shadow-sm">
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-8 shadow-lg ring-1 ring-tape-beige/50 space-y-6">
          <div className="flex items-center gap-3">
            <PenLine className="h-8 w-8 text-tape-brown" />
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
