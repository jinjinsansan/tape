import Link from "next/link";
import { Heart, Clock, Plus, Minus } from "lucide-react";

const negativeEmotions = ["恐怖", "悲しみ", "怒り", "寂しさ", "無価値感", "罪悪感", "悔しさ", "恥ずかしさ"];
const positiveEmotions = ["嬉しい", "感謝", "達成感", "幸せ"];

export default function NextStepsPage() {
  return (
    <div className="min-h-screen bg-tape-cream px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href="/diary" className="text-sm text-tape-light-brown hover:text-tape-brown">
          ← かんじょうにっきトップへ戻る
        </Link>
        <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-tape-beige/60">
          <h1 className="text-3xl font-bold text-tape-brown text-center">次にやること</h1>
          <p className="mt-3 text-center text-sm text-tape-light-brown">
            翌日以降に記録するときの手順やスコア調整の考え方をまとめました。
          </p>

          <section className="mt-8 space-y-4">
            <div className="rounded-2xl border border-tape-brown/30 bg-tape-brown/5 p-4">
              <h2 className="text-lg font-semibold text-tape-brown text-center">8つのネガティブな感情</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {negativeEmotions.map((emotion) => (
                  <span key={emotion} className="rounded-full bg-white px-3 py-1 text-center text-tape-brown shadow-sm">
                    {emotion}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-tape-green/30 bg-tape-green/5 p-4">
              <h2 className="text-lg font-semibold text-tape-brown text-center">4つのポジティブな感情</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {positiveEmotions.map((emotion) => (
                  <span key={emotion} className="rounded-full bg-white px-3 py-1 text-center text-tape-brown shadow-sm">
                    {emotion}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-8 space-y-4">
            <div className="rounded-2xl border border-tape-pink/40 bg-tape-pink/5 p-4">
              <div className="flex items-center gap-3">
                <Heart className="h-6 w-6 text-tape-pink" />
                <h3 className="text-lg font-semibold text-tape-brown">無価値感を選んだときのスコア入力</h3>
              </div>
              <p className="mt-2 text-sm text-tape-light-brown">
                無価値感またはポジティブ感情を選んだ場合は、自己肯定感スコアと無価値感スコアを手動で調整します。
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
                  <Plus className="h-4 w-4 text-tape-green" />
                  <span>自己肯定感が上がった → 自己肯定感スコアを上げ、無価値感スコアを下げる</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
                  <Minus className="h-4 w-4 text-tape-pink" />
                  <span>自己肯定感が下がった → 自己肯定感スコアを下げ、無価値感スコアを上げる</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-tape-purple/30 bg-tape-purple/5 p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-tape-purple" />
                <h3 className="text-lg font-semibold text-tape-brown">毎日続けると見えてくること</h3>
              </div>
              <p className="mt-2 text-sm text-tape-light-brown">
                無価値感の上下は自己肯定感の上下と連動しています。ポジティブな感情も丁寧に記録することで、「上がった理由」も見つけられます。
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
