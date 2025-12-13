"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  disabled: boolean;
};

const bulletPoints = [
  "願望を心の中心に据える対話テンプレート",
  "引き寄せレクチャー100本分のナレッジ",
  "波動を整えるアファメーション生成",
  "行動計画と受け取りサインの可視化"
];

const flow = [
  { step: "01", text: "願望と背景ストーリーを言語化" },
  { step: "02", text: "制限的思考を書き換える" },
  { step: "03", text: "波動を整えるセルフワーク" },
  { step: "04", text: "行動・受け取りのシグナル設計" }
];

export default function AttractionLanding({ disabled }: Props) {
  return (
    <div className="space-y-16">
      <section className="rounded-[40px] border border-sky-100 bg-[#eff6ff] px-6 py-12 shadow-sm">
        <div className="flex flex-col gap-10 lg:flex-row">
          <div className="space-y-6 lg:w-1/2">
            <div>
              <p className="text-xs font-bold tracking-[0.3em] text-sky-500 uppercase">Attraction</p>
              <h2 className="mt-3 text-4xl font-bold text-[#1f365c] leading-tight">
                ミシェル引き寄せ<br />× AIマニフェスト
              </h2>
              <p className="mt-4 text-sm text-[#1f365c]/80 leading-relaxed">
                感情と思考の波長を揃えるプロセスをAIが即時に提示。テープ式心理学の問いかけに、引き寄せ専門のRAGを組み合わせたハイブリッドチャットです。
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                disabled={disabled}
                className="h-14 flex-1 rounded-full bg-sky-500 text-white shadow-lg shadow-sky-200/60 hover:bg-sky-400"
              >
                <Link href="/michelle/attraction/chat" className="flex w-full items-center justify-center">
                  チャットを始める
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 flex-1 rounded-full border-2 border-sky-200 bg-white text-[#1f365c] hover:bg-sky-50"
              >
                <Link href="#attraction-features">特徴を読む</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {bulletPoints.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/70 p-3 text-left">
                  <CheckCircle2 className="h-5 w-5 text-sky-500" />
                  <span className="text-sm font-semibold text-[#1f365c]">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:w-1/2">
            <div className="relative z-10 rounded-3xl border border-white/60 bg-white p-8 shadow-2xl shadow-sky-200/40">
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-xs font-bold tracking-[0.3em] text-slate-400">MICHELLE ATTRACT</span>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-600">BETA</span>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-[#1f365c]">「叶えたい未来、何度でも描き直そう」</h3>
                  <p className="mt-2 text-sm text-[#1f365c]/80">
                    感情・思考・行動の波長を揃えるワークをAIが即時生成。迷ったときに戻れるマニフェストシートをその場で整えます。
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-[#f3f8ff] p-6">
                  <p className="mb-4 flex items-center gap-2 text-sm font-bold text-sky-600">
                    <span className="block h-4 w-1 rounded-full bg-sky-500" /> マニフェストフロー
                  </p>
                  <div className="space-y-3">
                    {flow.map((item) => (
                      <div key={item.step} className="flex items-center gap-4">
                        <span className="text-xs font-mono font-bold text-slate-300">{item.step}</span>
                        <span className="text-sm font-semibold text-[#1f365c]">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-8 -right-6 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" />
            <div className="absolute -bottom-8 -left-6 h-48 w-48 rounded-full bg-cyan-200/30 blur-3xl" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-inner" id="attraction-features">
        <h3 className="text-2xl font-bold text-[#1f365c]">ミシェル心理学とのハイブリッドAI</h3>
        <p className="mt-4 text-sm text-[#1f365c]/80">
          心理的課題を解くモードと、願望実現に集中するモードを同じAIで切り替え可能。願望設定・波動調整・行動設計まで連続した会話でデザインできます。
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          { title: "意図を定める", desc: "叶えたい未来を分解し、願望・背景・感情を丁寧に言語化。" },
          { title: "波動を整える", desc: "制限的信念の書き換えやアファメーション生成で周波数を調整。" },
          { title: "受け取る準備", desc: "小さな行動計画と受信サインを明確化し、行動と感情をリンク。" }
        ].map((feature, index) => (
          <div key={feature.title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold text-slate-400">PHASE 0{index + 1}</p>
            <h4 className="mt-3 text-xl font-bold text-[#1f365c]">{feature.title}</h4>
            <p className="mt-2 text-sm text-[#1f365c]/80">{feature.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
