"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  disabled: boolean;
};

const bulletPoints = [
  "苦しい感情の原因をテープ式心理学のロジックで整理",
  "講義100本分の知識をLLMに埋め込み済み",
  "感情→意味づけ→行動まで一貫サポート",
  "守秘義務・ログ閲覧制限で安心"
];

const flow = [
  { step: "01", text: "現在の状況ヒアリング" },
  { step: "02", text: "感情の整理整頓" },
  { step: "03", text: "意味づけの仮説提示" },
  { step: "04", text: "気づきとセルフワーク提案" }
];

export default function PsychologyLanding({ disabled }: Props) {
  return (
    <div className="space-y-16">
      <section className="rounded-[40px] border border-[#f0e8df] bg-gradient-to-br from-[#fffdf9] via-[#fbf7f2] to-[#f5f2ff] px-6 py-12 shadow-sm">
        <div className="flex flex-col gap-10 lg:flex-row">
          <div className="space-y-6 lg:w-1/2">
            <div>
              <p className="text-xs font-bold tracking-[0.3em] text-[#c68e9b] uppercase">Psychology</p>
              <h2 className="mt-3 text-4xl font-bold text-[#4b3f3a] leading-tight">
                テープ式心理学<br />× AIカウンセリング
              </h2>
              <p className="mt-4 text-sm text-[#6d5c55] leading-relaxed">
                テープ式心理学で培った「ガムテープ（思い込み）」分析の問いかけをAIに移植。耳ざわりの良い言葉ではなく、
                事実・感情・思考を切り分けながら本質的な気づきを促します。
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                disabled={disabled}
                className="h-14 flex-1 rounded-full bg-[#c68e9b] text-white shadow-lg shadow-[#c68e9b]/25 transition hover:bg-[#bd8491]"
              >
                <Link href="/michelle/chat" className="flex w-full items-center justify-center gap-2">
                  カウンセリングを始める
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 flex-1 rounded-full border border-[#dccfc8] bg-white/80 text-[#5c4c45] hover:bg-white"
              >
                <Link href="#psychology-features">特徴を読む</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {bulletPoints.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#f0e8df] bg-white/70 p-3 text-left">
                  <CheckCircle2 className="h-5 w-5 text-[#c68e9b]" />
                  <span className="text-sm font-semibold text-[#4b3f3a]">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:w-1/2">
            <div className="relative z-10 rounded-3xl border border-white/80 bg-white/95 p-8 shadow-2xl shadow-[#d8cfd3]/80">
              <div className="mb-6 flex items-center justify-between border-b border-[#f0e8df] pb-4">
                <span className="text-xs font-bold tracking-[0.3em] text-[#9b8d85]">MICHELLE AI</span>
                <span className="rounded-full bg-[#fdf1f4] px-3 py-1 text-xs font-bold text-[#c68e9b]">BETA</span>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-[#4b3f3a]">「そのモヤモヤ、どこから来ていますか？」</h3>
                  <p className="mt-2 text-sm text-[#6d5c55]">
                    対話のたびに整理メモとセルフワーク案を残してくれるので、自分だけのカウンセリングノートが育っていきます。
                  </p>
                </div>
                <div className="rounded-2xl border border-[#f0e8df] bg-[#fdf7f1] p-6">
                  <p className="mb-4 flex items-center gap-2 text-sm font-bold text-[#c68e9b]">
                    <span className="block h-4 w-1 rounded-full bg-[#c68e9b]" /> カウンセリングフロー
                  </p>
                  <div className="space-y-3">
                    {flow.map((item) => (
                      <div key={item.step} className="flex items-center gap-4">
                        <span className="text-xs font-mono font-bold text-[#a3958e]">{item.step}</span>
                        <span className="text-sm font-semibold text-[#4b3f3a]">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-8 -right-6 h-48 w-48 rounded-full bg-[#f4e7e2]/70 blur-3xl" />
            <div className="absolute -bottom-8 -left-6 h-48 w-48 rounded-full bg-[#efeaf5]/70 blur-3xl" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#f0e8df] bg-white/90 p-8 text-center shadow-inner" id="psychology-features">
        <h3 className="text-2xl font-bold text-[#4b3f3a]">一般的なAIとの決定的な違い</h3>
        <p className="mt-4 text-sm text-[#6d5c55]">
          chatGPTのような汎用AIはユーザーに寄り添う言葉を返すことは得意ですが、 論理的に思い込みへアプローチする訓練はされていません。テープ式心理学版ミシェルは、
          仁カウンセラーの講義原稿やQ&AをRAGで参照しながら「なぜその感情が発生したのか」を最後まで追いかけます。
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          { title: "思考を整える", desc: "出来事・言葉・身体反応を丁寧に分け、混ざった感情を整理。" },
          { title: "感情を受け止める", desc: "根っこにある思い込みを仮説として提示し、新しい視点を提案。" },
          { title: "行動につなげる", desc: "試せるセルフワークと行動案を提示し、次の一歩を伴走。" }
        ].map((feature, index) => (
          <div key={feature.title} className="rounded-3xl border border-[#f0e8df] bg-white/90 p-6 shadow-sm">
            <p className="text-xs font-semibold text-[#a3958e]">PHASE 0{index + 1}</p>
            <h4 className="mt-3 text-xl font-bold text-[#4b3f3a]">{feature.title}</h4>
            <p className="mt-2 text-sm text-[#6d5c55]">{feature.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
