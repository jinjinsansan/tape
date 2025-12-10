import Link from "next/link";
import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function MichelleLandingPage() {
  if (!MICHELLE_AI_ENABLED) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-tape-brown">ミシェル心理学AIは準備中です</h1>
        <p className="mt-4 text-sm text-tape-light-brown">公開まで今しばらくお待ちください。</p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="space-y-4 text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-tape-green">TAPE式心理学</p>
        <h1 className="text-4xl font-bold text-tape-brown">テープ式心理学 × AIカウンセリング</h1>
        <p className="text-base text-tape-brown/80">
          26万文字を学習させたテープ式心理学専用AIです。<br className="hidden md:inline"/>
          感情整理・セルフワーク・思い込みの特定まで、一連の伴走をAIがサポートします。
        </p>
      </header>

      <div className="flex flex-col gap-4 text-center sm:flex-row sm:justify-center">
        <Link href="/michelle/chat">
          <Button size="lg" className="bg-tape-green text-tape-brown hover:bg-tape-green/90">
            カウンセリングを始める
          </Button>
        </Link>
      </div>

      <section id="about" className="grid gap-6 rounded-3xl bg-white p-8 shadow-sm md:grid-cols-3">
        {[
          {
            title: "フェーズ1",
            desc: "出来事・感情・身体感覚を分けて整理し、モヤモヤを言語化します。"
          },
          {
            title: "フェーズ2",
            desc: "感情の芯にある思い込み仮説を提示し、AIが建設的な問いを返します。"
          },
          {
            title: "フェーズ3",
            desc: "セルフワークや行動提案を示して、次の一歩を伴走します。"
          }
        ].map((item) => (
          <Card key={item.title} className="bg-tape-beige/30 border-none shadow-none">
            <CardContent className="p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tape-light-brown">{item.title}</p>
              <p className="mt-3 text-sm text-tape-brown">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </section>
  );
}
