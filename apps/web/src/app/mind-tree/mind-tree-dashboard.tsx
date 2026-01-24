"use client";

import { useEffect, useState } from "react";
import { TreeCanvas } from "@/components/mind-tree";
import { cn } from "@/lib/utils";
import { SITE_TITLE_FONT_CLASS } from "@/lib/branding";
import { SiteFooter } from "@/components/site-footer";
import type { Database } from "@tape/supabase";

type MindTreeStage = Database["public"]["Enums"]["mind_tree_stage"];

type MindTreeData = {
  stage: MindTreeStage;
  growth_points: number;
  primary_color: string;
  secondary_color: string;
  shape_variant: number;
  leaf_variant: number;
  background_variant: number;
  emotion_diversity_score: number;
  last_event_at: string | null;
  emotions: {
    emotion_key: string;
    entry_count: number;
    total_intensity: number;
  }[];
};

type MindTreeDashboardProps = {
  userId: string | null;
};

const STAGE_LABELS: Record<MindTreeStage, string> = {
  seed: "種",
  sprout: "芽",
  sapling: "若木",
  blooming: "開花",
  fruit_bearing: "実り",
  guardian: "守護樹"
};

const STAGE_DESCRIPTIONS: Record<MindTreeStage, string> = {
  seed: "あなたの感情の旅が始まりました。日記を書くたびに、この小さな種に命が宿ります。",
  sprout: "少しずつ芽が出てきました。感情と向き合う習慣が、確実に根を張り始めています。",
  sapling: "しっかりとした若木へと成長しました。あなたの内面理解が深まってきています。",
  blooming: "美しい花が咲き始めました。感情を大切に扱う力が花開いています。",
  fruit_bearing: "豊かな実りの時です。あなたの感情との対話が、人生に実りをもたらしています。",
  guardian: "立派な守護樹へと成長しました。あなたの心を守り、支える大きな存在です。"
};

const STAGE_THRESHOLDS = [0, 50, 150, 400, 800, 1500] as const;
const STAGE_ORDER: MindTreeStage[] = [
  "seed",
  "sprout",
  "sapling",
  "blooming",
  "fruit_bearing",
  "guardian"
];

const getNextStageInfo = (currentStage: MindTreeStage, currentPoints: number) => {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
    return null;
  }

  const nextStage = STAGE_ORDER[currentIndex + 1];
  const nextThreshold = STAGE_THRESHOLDS[currentIndex + 1];
  const pointsNeeded = nextThreshold - currentPoints;

  return {
    nextStage,
    nextThreshold,
    pointsNeeded,
    progress: (currentPoints / nextThreshold) * 100
  };
};

export function MindTreeDashboard({ userId }: MindTreeDashboardProps) {
  const [tree, setTree] = useState<MindTreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadTree = async () => {
      try {
        const res = await fetch("/api/mind-tree", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("読み込みに失敗しました");
        }
        const data = await res.json();
        if (mounted && data.tree) {
          setTree(data.tree);
        }
      } catch (err) {
        if (mounted) {
          setError("木の情報を読み込めませんでした");
          console.error(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTree();

    return () => {
      mounted = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fffaf4] via-[#f9f3ff] to-[#f2fbff]">
        <p className="text-[#8b7a71]">読み込み中...</p>
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#fffaf4] via-[#f9f3ff] to-[#f2fbff]">
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="rounded-3xl bg-white/90 p-8 text-center shadow-[0_18px_38px_rgba(81,67,60,0.08)]">
            <p className="text-[#8b7a71]">
              {error || "木の情報が見つかりませんでした"}
            </p>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const nextStageInfo = getNextStageInfo(tree.stage, tree.growth_points);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#fffaf4] via-[#f9f3ff] to-[#f2fbff]">
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 pb-12 pt-6 md:px-8">
        <header className="space-y-2 text-center">
          <h1 className={cn("text-3xl text-[#51433c] md:text-4xl", SITE_TITLE_FONT_CLASS)}>
            あなたの感情の木
          </h1>
          <p className="text-sm text-[#8b7a71]">
            日記を書くたびに、この木は成長していきます
          </p>
        </header>

        <section className="rounded-3xl border border-[#f0e4d8] bg-white/90 p-8 shadow-[0_18px_38px_rgba(81,67,60,0.04)] md:p-12">
          <div className="mx-auto max-w-sm">
            <TreeCanvas
              stage={tree.stage}
              primaryColor={tree.primary_color}
              secondaryColor={tree.secondary_color}
              backgroundVariant={tree.background_variant}
              shapeVariant={tree.shape_variant}
              leafVariant={tree.leaf_variant}
              className="w-full"
            />
          </div>

          <div className="mt-8 space-y-4 text-center">
            <div>
              <div className="mb-2 inline-block rounded-full bg-gradient-to-r from-[#f0f9f4] to-[#f9f3ff] px-6 py-2">
                <p className="text-sm font-medium text-[#2d9061]">現在の成長段階</p>
              </div>
              <h2 className={cn("text-2xl text-[#51433c] md:text-3xl", SITE_TITLE_FONT_CLASS)}>
                {STAGE_LABELS[tree.stage]}
              </h2>
            </div>

            <p className="mx-auto max-w-lg text-base leading-relaxed text-[#8b7a71]">
              {STAGE_DESCRIPTIONS[tree.stage]}
            </p>
          </div>
        </section>

        {nextStageInfo && (
          <section className="rounded-3xl border border-[#e3f2e8] bg-gradient-to-br from-[#f0f9f4] to-white p-6 shadow-lg md:p-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#51433c]">
                  次の成長段階まで
                </h3>
                <span className="text-2xl font-bold text-[#2d9061]">
                  あと{nextStageInfo.pointsNeeded}
                </span>
              </div>

              <div className="space-y-2">
                <div className="h-3 w-full overflow-hidden rounded-full bg-white/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2d9061] to-[#4db884] transition-all duration-500"
                    style={{ width: `${Math.min(nextStageInfo.progress, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-[#8b7a71]">
                  次の段階「{STAGE_LABELS[nextStageInfo.nextStage]}」へ
                </p>
              </div>
            </div>
          </section>
        )}

        {tree.stage === "guardian" && (
          <section className="rounded-3xl border border-[#f0e4d8] bg-gradient-to-br from-[#fff9f5] via-white to-[#f9f3ff] p-6 text-center shadow-lg md:p-8">
            <div className="space-y-3">
              <p className="text-2xl">🌟</p>
              <h3 className="text-xl font-bold text-[#51433c]">
                最高段階に到達しました
              </h3>
              <p className="text-sm leading-relaxed text-[#8b7a71]">
                これからも日記を書き続けることで、この木はさらに深く、豊かに育ち続けます。
              </p>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-[#f0e4d8] bg-white/90 p-6 shadow-[0_18px_38px_rgba(81,67,60,0.04)] md:p-8">
          <h3 className="mb-4 text-center text-lg font-semibold text-[#51433c]">
            木の成長について
          </h3>
          <div className="space-y-3 text-sm leading-relaxed text-[#8b7a71]">
            <p>
              この木は、あなたが感情日記を書くたびに成長します。
            </p>
            <p>
              感情を選んだり、自己肯定感テストの結果を記録したりすることで、より多く成長します。
            </p>
            <p>
              木の色や形は、あなただけのものです。誰一人として同じ木は存在しません。
            </p>
            <p className="pt-2 font-medium text-[#51433c]">
              あなたの感情と向き合い続けることが、この木を育てる唯一の方法です。
            </p>
          </div>
        </section>

        {tree.emotions && tree.emotions.length > 0 && (
          <section className="rounded-3xl border border-[#f0e4d8] bg-white/90 p-6 shadow-[0_18px_38px_rgba(81,67,60,0.04)] md:p-8">
            <h3 className="mb-4 text-center text-lg font-semibold text-[#51433c]">
              よく記録する感情
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {tree.emotions.slice(0, 10).map((emotion) => (
                <div
                  key={emotion.emotion_key}
                  className="rounded-full border border-[#f0e4d8] bg-gradient-to-r from-[#fef6ff] to-[#f9f3ff] px-4 py-2 text-sm"
                >
                  <span className="font-medium text-[#51433c]">
                    {emotion.emotion_key}
                  </span>
                  <span className="ml-2 text-xs text-[#8b7a71]">
                    ×{emotion.entry_count}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
