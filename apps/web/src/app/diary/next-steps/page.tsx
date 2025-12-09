import Link from "next/link";
import { Heart, Clock, Plus, Minus, Sparkles } from "lucide-react";

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

export default function NextStepsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-tape-cream via-white to-tape-beige px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href="/diary" className="text-sm text-tape-light-brown hover:text-tape-brown">
          ← かんじょうにっきトップへ戻る
        </Link>
        <div className="relative overflow-hidden rounded-3xl bg-white/90 p-6 shadow-2xl ring-1 ring-tape-beige/60">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(248,195,195,.35),_transparent_55%)]" />
          <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-tape-orange/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-tape-green/20 blur-3xl" />

          <div className="relative space-y-8">
            <div className="text-center">
              <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-tape-pink/10 px-4 py-1 text-xs font-semibold text-tape-pink">
                <Sparkles className="h-4 w-4" /> 毎日のアップデートをカラフルに
              </p>
              <h1 className="mt-3 text-3xl font-bold text-tape-brown">次にやること</h1>
              <p className="mt-2 text-sm text-tape-light-brown">
                翌日以降に記録するときの手順やスコア調整の考え方をカラーチャートでまとめました。
              </p>
            </div>

            <section className="space-y-4">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-3xl border border-tape-brown/20 bg-gradient-to-br from-tape-brown/5 via-white to-tape-beige/60 p-5">
                  <h2 className="text-lg font-semibold text-tape-brown text-center">8つのネガティブな感情</h2>
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
                  <h2 className="text-lg font-semibold text-tape-brown text-center">4つのポジティブな感情</h2>
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
            </section>

            <section className="space-y-5">
              <div className="rounded-3xl border border-tape-pink/30 bg-gradient-to-br from-tape-pink/10 via-white to-tape-orange/10 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-tape-pink shadow">
                    <Heart className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-tape-brown">無価値感を選んだときのスコア入力</h3>
                    <p className="text-sm text-tape-light-brown">
                      無価値感またはポジティブ感情を選んだ場合は、自己肯定感スコアと無価値感スコアを手動で調整します。
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-2xl border border-tape-green/30 bg-white/80 p-4 shadow-sm">
                    <Plus className="h-5 w-5 text-tape-green" />
                    <span className="text-sm text-tape-brown">
                      自己肯定感が上がった → 自己肯定感スコアを上げ、無価値感スコアを下げる
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-tape-pink/30 bg-white/80 p-4 shadow-sm">
                    <Minus className="h-5 w-5 text-tape-pink" />
                    <span className="text-sm text-tape-brown">
                      自己肯定感が下がった → 自己肯定感スコアを下げ、無価値感スコアを上げる
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-tape-purple/30 bg-gradient-to-br from-tape-purple/10 via-white to-tape-cream p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-tape-purple shadow">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-tape-brown">毎日続けると見えてくること</h3>
                    <p className="text-sm text-tape-light-brown">
                      無価値感の上下は自己肯定感の上下と連動しています。ポジティブな感情も丁寧に記録することで、「上がった理由」も見つけられます。
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {["感じた感情をまず受け止める", "意味づけを言葉にする", "スコアで変化を見える化"].map((tip) => (
                    <div key={tip} className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-xs font-semibold text-tape-brown shadow-sm">
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
