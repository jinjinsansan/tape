"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";

import { MICHELLE_AI_ENABLED, MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Variant = "psychology" | "attraction";

export default function MichelleLandingPage() {
  const isPsychologyAvailable = MICHELLE_AI_ENABLED;
  const isAttractionAvailable = MICHELLE_ATTRACTION_AI_ENABLED;

  if (!isPsychologyAvailable && !isAttractionAvailable) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-tape-brown">ミシェルAIは準備中です</h1>
        <p className="mt-4 text-sm text-tape-light-brown">公開まで今しばらくお待ちください。</p>
      </section>
    );
  }

  const tabs = [
    { id: "psychology" as Variant, label: "ミシェル心理学チャット", available: isPsychologyAvailable },
    { id: "attraction" as Variant, label: "ミシェル引き寄せチャット", available: isAttractionAvailable }
  ];

  const firstAvailable = tabs.find((tab) => tab.available)?.id ?? "psychology";
  const [selected, setSelected] = useState<Variant>(firstAvailable);
  const availableTabs = tabs.filter((tab) => tab.available);

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
      <header className="space-y-4 text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-tape-green">テープ式心理学</p>
        <h1 className="text-4xl font-bold text-tape-brown">あなたの課題に合わせてAIコンシェルジュを選択</h1>
        <p className="text-base text-tape-brown/80">
          Google Cloud 上で動くテープ式心理学専用LLMが、感情の整理から願望実現まで伴走します。<br className="hidden md:inline" />
          同じページ内で「心の解体」に特化したピンクプランと、「引き寄せ・現実創造」に特化したブループランを切り替えられます。
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={!tab.available}
            onClick={() => tab.available && setSelected(tab.id)}
            className={cn(
              "rounded-full border px-6 py-3 text-sm font-semibold transition-all",
              tab.available
                ? selected === tab.id
                  ? "bg-tape-brown text-white shadow-lg"
                  : "bg-white text-tape-brown hover:bg-tape-beige"
                : "bg-tape-beige text-tape-light-brown cursor-not-allowed"
            )}
          >
            {tab.label}
            {!tab.available && "（準備中）"}
          </button>
        ))}
      </div>

      {selected === "psychology" ? (
        <PsychologyLanding disabled={!isPsychologyAvailable} />
      ) : (
        <AttractionLanding disabled={!isAttractionAvailable} />
      )}

      {availableTabs.length > 1 && (
        <section className="grid gap-6 rounded-3xl bg-white p-8 shadow-sm md:grid-cols-3">
          {["出来事・感情・身体感覚を分ける", "思い込み仮説を立てる", "セルフワークと行動計画を伴走"].map((desc, index) => (
            <Card key={desc} className="bg-tape-beige/30 border-none shadow-none">
              <CardContent className="p-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tape-light-brown">PHASE 0{index + 1}</p>
                <p className="mt-3 text-sm text-tape-brown">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </section>
  );
}

function PsychologyLanding({ disabled }: { disabled: boolean }) {
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

  return (
    <div className="space-y-16">
      <section className="rounded-[40px] border border-[#fcd9e9] bg-[#fff7fa] px-6 py-12 shadow-sm">
        <div className="flex flex-col gap-10 lg:flex-row">
          <div className="space-y-6 lg:w-1/2">
            <div>
              <p className="text-xs font-bold tracking-[0.3em] text-tape-pink uppercase">Psychology</p>
              <h2 className="mt-3 text-4xl font-bold text-tape-brown leading-tight">
                テープ式心理学<br />× AIカウンセリング
              </h2>
              <p className="mt-4 text-sm text-tape-brown/80 leading-relaxed">
                テープ式心理学で培った「ガムテープ（思い込み）」分析の問いかけをAIに移植。耳ざわりの良い言葉ではなく、
                事実・感情・思考を切り分けながら本質的な気づきを促します。
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                disabled={disabled}
                className="h-14 flex-1 rounded-full bg-tape-pink text-white shadow-lg shadow-tape-pink/40 hover:bg-tape-pink/90"
              >
                <Link href="/michelle/chat" className="flex w-full items-center justify-center gap-2">
                  カウンセリングを始める
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 flex-1 rounded-full border-2 border-tape-pink/30 bg-white text-tape-brown hover:bg-[#fff0f5]"
              >
                <Link href="#psychology-features">特徴を読む</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {bulletPoints.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/70 p-3 text-left">
                  <CheckCircle2 className="h-5 w-5 text-tape-pink" />
                  <span className="text-sm font-semibold text-tape-brown">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:w-1/2">
            <div className="relative z-10 rounded-3xl border border-white/60 bg-white p-8 shadow-2xl shadow-tape-pink/10">
              <div className="mb-6 flex items-center justify-between border-b border-tape-beige pb-4">
                <span className="text-xs font-bold tracking-[0.3em] text-tape-light-brown">MICHELLE AI</span>
                <span className="rounded-full bg-[#ffe0ec] px-3 py-1 text-xs font-bold text-tape-pink">BETA</span>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-tape-brown">「そのモヤモヤ、どこから来ていますか？」</h3>
                  <p className="mt-2 text-sm text-tape-brown/80">
                    対話のたびに整理メモとセルフワーク案を残してくれるので、自分だけのカウンセリングノートが育っていきます。
                  </p>
                </div>
                <div className="rounded-2xl border border-tape-beige bg-[#fff8fb] p-6">
                  <p className="mb-4 flex items-center gap-2 text-sm font-bold text-tape-pink">
                    <span className="block h-4 w-1 rounded-full bg-tape-pink" /> カウンセリングフロー
                  </p>
                  <div className="space-y-3">
                    {flow.map((item) => (
                      <div key={item.step} className="flex items-center gap-4">
                        <span className="text-xs font-mono font-bold text-tape-light-brown">{item.step}</span>
                        <span className="text-sm font-semibold text-tape-brown">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-8 -right-6 h-48 w-48 rounded-full bg-tape-pink/10 blur-3xl" />
            <div className="absolute -bottom-8 -left-6 h-48 w-48 rounded-full bg-tape-orange/10 blur-3xl" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-tape-beige bg-white p-8 text-center shadow-inner" id="psychology-features">
        <h3 className="text-2xl font-bold text-tape-brown">一般的なAIとの決定的な違い</h3>
        <p className="mt-4 text-sm text-tape-brown/80">
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
          <div key={feature.title} className="rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold text-tape-light-brown">PHASE 0{index + 1}</p>
            <h4 className="mt-3 text-xl font-bold text-tape-brown">{feature.title}</h4>
            <p className="mt-2 text-sm text-tape-brown/80">{feature.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function AttractionLanding({ disabled }: { disabled: boolean }) {
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
