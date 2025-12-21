"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { MICHELLE_AI_ENABLED, MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PsychologyLanding = dynamic(() => import("@/components/michelle/psychology-landing"), {
  loading: () => <LandingSkeleton variant="psychology" />,
  ssr: false
});

const AttractionLanding = dynamic(() => import("@/components/michelle/attraction-landing"), {
  loading: () => <LandingSkeleton variant="attraction" />,
  ssr: false
});

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
    <div className="bg-[#f9f7f3]">
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
                  ? "bg-[#d9cec4] text-[#3f3530] shadow-md"
                  : "bg-white text-[#5c4c45] hover:bg-[#f7f4f0]"
                : "bg-[#f1ece6] text-[#a1958d] cursor-not-allowed"
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
        <section className="grid gap-6 rounded-3xl bg-white/90 p-8 shadow-sm md:grid-cols-3">
          {["出来事・感情・身体感覚を分ける", "思い込み仮説を立てる", "セルフワークと行動計画を伴走"].map((desc, index) => (
            <Card key={desc} className="border border-[#efe7de] bg-white shadow-none">
              <CardContent className="p-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tape-light-brown">PHASE 0{index + 1}</p>
                <p className="mt-3 text-sm text-tape-brown">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
      </section>
    </div>
  );
}

const LandingSkeleton = ({ variant }: { variant: Variant }) => (
  <div className="rounded-[40px] border border-dashed border-tape-beige bg-white/60 p-10 shadow-sm">
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-32 rounded-full bg-tape-beige" />
      <div className="space-y-2">
        <div className="h-8 w-2/3 rounded-full bg-tape-beige/80" />
        <div className="h-4 w-3/4 rounded-full bg-tape-beige/60" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={`${variant}-skeleton-${idx}`} className="h-16 rounded-2xl bg-tape-beige/40" />
        ))}
      </div>
    </div>
  </div>
);
