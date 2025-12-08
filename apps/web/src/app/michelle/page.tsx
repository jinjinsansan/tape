import Link from "next/link";

import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";

export default function MichelleLandingPage() {
  if (!MICHELLE_AI_ENABLED) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-slate-900">ミシェル心理学AIは準備中です</h1>
        <p className="mt-4 text-sm text-slate-500">公開まで今しばらくお待ちください。</p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="space-y-4 text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-rose-400">TAPE式心理学</p>
        <h1 className="text-4xl font-black text-slate-900">ミシェル心理学 × AIカウンセリング</h1>
        <p className="text-base text-slate-600">
          Tape式心理学の講座・ケーススタディー・カウンセリングログをRAGとして学習させた専用AIです。
          感情整理・セルフワーク・思い込みの特定まで、一連の伴走をAIがサポートします。
        </p>
      </header>

      <div className="flex flex-col gap-4 text-center sm:flex-row sm:justify-center">
        <Link
          href="/michelle/chat"
          className="rounded-full bg-rose-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600"
        >
          カウンセリングを始める
        </Link>
        <a
          href="#about"
          className="rounded-full border border-slate-200 px-8 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          3つのフェーズを見る
        </a>
      </div>

      <section id="about" className="grid gap-6 rounded-3xl bg-white/70 p-8 shadow-xl shadow-slate-200/40 md:grid-cols-3">
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
          <article key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{item.title}</p>
            <p className="mt-3 text-sm text-slate-600">{item.desc}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
