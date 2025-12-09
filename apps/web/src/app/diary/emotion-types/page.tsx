import Link from "next/link";
import { MessageCircle, Star } from "lucide-react";

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
    <div className="min-h-screen bg-tape-cream px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href="/diary" className="text-sm text-tape-light-brown hover:text-tape-brown">
          ← かんじょうにっきトップへ戻る
        </Link>
        <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-tape-beige/50">
          <h1 className="text-3xl font-bold text-tape-brown">感情の種類</h1>
          <p className="mt-2 text-sm text-tape-light-brown">
            感情を言語化すると、思考の癖や身体反応とのつながりが見えてきます。迷ったらこのリストに戻って感情を指差し確認してください。
          </p>

          <section className="mt-8 space-y-4">
            <div className="flex items-center gap-2 text-tape-brown">
              <MessageCircle className="h-5 w-5" />
              <h2 className="text-xl font-semibold">ネガティブな感情</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {negativeEmotions.map((emotion) => (
                <div key={emotion.name} className="rounded-2xl border border-tape-beige bg-tape-cream/60 p-4">
                  <p className="text-lg font-semibold text-tape-brown">{emotion.name}</p>
                  <p className="mt-2 text-sm text-tape-light-brown">{emotion.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 space-y-4">
            <div className="flex items-center gap-2 text-tape-brown">
              <Star className="h-5 w-5 text-tape-orange" />
              <h2 className="text-xl font-semibold">ポジティブな感情</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {positiveEmotions.map((emotion) => (
                <div key={emotion.name} className="rounded-2xl border border-tape-orange/40 bg-white p-4">
                  <p className="text-lg font-semibold text-tape-brown">{emotion.name}</p>
                  <p className="mt-2 text-sm text-tape-light-brown">{emotion.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
