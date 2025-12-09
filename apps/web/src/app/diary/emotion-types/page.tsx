import Link from "next/link";
import { MessageCircle, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const emotionToneMap: Record<string, string> = {
  恐怖: "bg-purple-100 text-purple-800 border-purple-200",
  悲しみ: "bg-blue-100 text-blue-800 border-blue-200",
  怒り: "bg-red-100 text-red-800 border-red-200",
  寂しさ: "bg-indigo-100 text-indigo-800 border-indigo-200",
  無価値感: "bg-gray-100 text-gray-800 border-gray-300",
  罪悪感: "bg-orange-100 text-orange-800 border-orange-200",
  悔しさ: "bg-green-100 text-green-800 border-green-200",
  恥ずかしさ: "bg-pink-100 text-pink-800 border-pink-200",
  嬉しい: "bg-yellow-100 text-yellow-800 border-yellow-200",
  感謝: "bg-teal-100 text-teal-800 border-teal-200",
  達成感: "bg-lime-100 text-lime-800 border-lime-200",
  幸せ: "bg-amber-100 text-amber-800 border-amber-200"
};

const negativeEmotions = [
  { name: "恐怖", description: "息苦しさ、震え、冷や汗など身体の反応が強く現れる状態。" },
  { name: "悲しみ", description: "喪失感や心に穴が空いたような感覚。" },
  { name: "怒り", description: "体温が上がり、拳を握るようなエネルギー。" },
  { name: "寂しさ", description: "孤独を感じ、誰かに会いたくなる気持ち。" },
  { name: "無価値感", description: "存在意義が無いと感じる深い自己否定。" },
  { name: "罪悪感", description: "申し訳なさや取り返しがつかないと感じる思い。" },
  { name: "悔しさ", description: "やり返したい、もっと出来たはずというエネルギー。" },
  { name: "恥ずかしさ", description: "隠れたくなる、顔が赤くなる感覚。" }
];

const positiveEmotions = [
  { name: "嬉しい", description: "心が弾み、自然と笑顔になる感覚。" },
  { name: "感謝", description: "支えられた温かさや恩返ししたい気持ち。" },
  { name: "達成感", description: "やり切った誇らしさ、努力が報われた感覚。" },
  { name: "幸せ", description: "満たされて安心している穏やかな状態。" }
];

export default function EmotionTypesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-tape-cream via-white to-tape-beige px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href="/diary" className="text-sm text-tape-light-brown hover:text-tape-brown">
          ← かんじょうにっきトップへ戻る
        </Link>
        <div className="relative overflow-hidden rounded-3xl bg-white/90 p-6 shadow-2xl ring-1 ring-tape-beige/50">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[conic-gradient(from_90deg,_rgba(255,192,203,.25),_transparent_65%)]" />
          <div className="pointer-events-none absolute -right-10 top-10 h-24 w-24 rounded-full bg-tape-orange/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-6 h-28 w-28 rounded-full bg-tape-green/20 blur-3xl" />

          <div className="relative space-y-8">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-tape-pink/10 px-4 py-1 text-xs font-semibold text-tape-pink">
                <Sparkles className="h-4 w-4" /> 感情カラーパレット
              </p>
              <h1 className="mt-3 text-3xl font-bold text-tape-brown">感情の種類</h1>
              <p className="mt-2 text-sm text-tape-light-brown">
                感情を言語化すると、思考の癖や身体反応とのつながりが見えてきます。迷ったらこのリストに戻って感情を指差し確認してください。
              </p>
            </div>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-tape-brown">
                <MessageCircle className="h-5 w-5" />
                <h2 className="text-xl font-semibold">ネガティブな感情</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {negativeEmotions.map((emotion) => (
                  <div
                    key={emotion.name}
                    className={cn(
                      "rounded-3xl border p-5 text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow",
                      emotionToneMap[emotion.name] ?? "bg-white text-tape-brown border-tape-beige"
                    )}
                  >
                    <p className="text-lg font-semibold text-current">{emotion.name}</p>
                    <p className="mt-2 text-sm text-tape-brown">{emotion.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-tape-brown">
                <Star className="h-5 w-5 text-tape-orange" />
                <h2 className="text-xl font-semibold">ポジティブな感情</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {positiveEmotions.map((emotion) => (
                  <div
                    key={emotion.name}
                    className={cn(
                      "rounded-3xl border p-5 text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow",
                      emotionToneMap[emotion.name] ?? "bg-white text-tape-brown border-tape-beige"
                    )}
                  >
                    <p className="text-lg font-semibold text-current">{emotion.name}</p>
                    <p className="mt-2 text-sm text-tape-brown">{emotion.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
