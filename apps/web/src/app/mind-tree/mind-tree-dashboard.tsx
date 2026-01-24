"use client";

import { useEffect, useState } from "react";
import { TreeCanvas } from "@/components/mind-tree";
import { STAGE_THEMES } from "@/components/mind-tree/theme";
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
  color_cycle_index: number;
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
  guardian: "ゴールの木"
};

const STAGE_DESCRIPTIONS: Record<MindTreeStage, string> = {
  seed: "あなたの感情の旅が始まりました。日記を書くたびに、この小さな種に命が宿ります。",
  sprout: "少しずつ芽が出てきました。感情と向き合う習慣が、確実に根を張り始めています。",
  sapling: "しっかりとした若木へと成長しました。あなたの内面理解が深まってきています。",
  blooming: "美しい花が咲き始めました。感情を大切に扱う力が花開いています。",
  fruit_bearing: "豊かな実りの時です。あなたの感情との対話が、人生に実りをもたらしています。",
  guardian: "心を支える大きな存在へ。自分自身を信じる力が満ちています。"
};

const STAGE_THRESHOLDS = [0, 50, 150, 400, 800, 1500] as const;

const rotateArray = <T,>(values: T[], shift: number) => {
  if (values.length === 0) return values;
  const offset = ((shift % values.length) + values.length) % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized.length === 3 ? normalized.repeat(2) : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
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
  const stageTheme = STAGE_THEMES[tree.stage];
  const colorCycle = tree.color_cycle_index ?? 0;
  const heroColors = rotateArray(stageTheme.hero, colorCycle);
  const heroBackground = `radial-gradient(circle at 20% 20%, ${heroColors[0]}, transparent 45%), linear-gradient(180deg, ${heroColors[0]}, ${heroColors[1]}, ${heroColors[2]})`;
  const accentColor = stageTheme.accent;
  const cardTintAlpha = 0.12 + (colorCycle % 6) * 0.02;
  const cardTint = hexToRgba(accentColor, cardTintAlpha);
  const cardBackground = stageTheme.card;
  const softCardBackground = stageTheme.cardSoft;
  const dynamicCardBackground = `linear-gradient(135deg, ${cardTint}, ${cardBackground})`;
  const dynamicSoftCardBackground = `linear-gradient(135deg, ${hexToRgba(accentColor, cardTintAlpha * 0.8)}, ${softCardBackground})`;
  const glowOverlay = hexToRgba(accentColor, 0.2 + (colorCycle % 5) * 0.03);
  const borderColor = stageTheme.border;
  const textColor = stageTheme.text;
  const mutedTextColor = stageTheme.mutedText;
  const seasonCards = STAGE_ORDER.map((seasonStage) => ({
    stage: seasonStage,
    label: STAGE_LABELS[seasonStage],
    description: STAGE_DESCRIPTIONS[seasonStage],
    theme: STAGE_THEMES[seasonStage],
    active: seasonStage === tree.stage
  }));

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: heroBackground }}
    >
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 pb-12 pt-6 md:px-8">
        <header className="space-y-2 text-center">
          <h1
            className={cn("text-3xl md:text-4xl", SITE_TITLE_FONT_CLASS)}
            style={{ color: textColor }}
          >
            あなたのゴールの木
          </h1>
          <p className="text-sm" style={{ color: mutedTextColor }}>
            日記を書くたびに少しずつ色合いを変えながら、あなたの内面を映し出します
          </p>
        </header>

        <section
          className="relative overflow-hidden rounded-3xl border shadow-[0_18px_38px_rgba(81,67,60,0.08)]"
          style={{
            borderColor,
            background: dynamicSoftCardBackground
          }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: glowOverlay }} />

          <div className="relative mx-auto max-w-sm px-8 pt-8 md:pt-12">
            <TreeCanvas
              stage={tree.stage}
              primaryColor={tree.primary_color}
              secondaryColor={tree.secondary_color}
              backgroundVariant={tree.background_variant}
              shapeVariant={tree.shape_variant}
              leafVariant={tree.leaf_variant}
              colorCycle={colorCycle}
              className="w-full drop-shadow-xl"
            />
          </div>

          <div className="relative space-y-4 px-6 pb-8 pt-4 text-center md:px-12 md:pb-12">
            <div>
              <div
                className="mb-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 shadow-sm"
                style={{
                  background: `linear-gradient(90deg, ${accentColor}22, ${accentColor}11)`
                }}
              >
                <span
                  className="h-2 w-2 animate-pulse rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                <p className="text-xs font-medium tracking-wide" style={{ color: accentColor }}>
                  現在の成長段階
                </p>
              </div>
              <h2
                className={cn("text-3xl md:text-4xl", SITE_TITLE_FONT_CLASS)}
                style={{ color: textColor }}
              >
                {STAGE_LABELS[tree.stage]}
              </h2>
            </div>

            <p
              className="mx-auto max-w-lg text-sm leading-relaxed md:text-base"
              style={{ color: mutedTextColor }}
            >
              {STAGE_DESCRIPTIONS[tree.stage]}
            </p>
          </div>
        </section>

        {nextStageInfo && (
          <section
            className="rounded-3xl border p-6 shadow-lg md:p-8"
            style={{
              borderColor,
              background: dynamicCardBackground
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold" style={{ color: textColor }}>
                  次の成長段階まで
                </h3>
                <span className="text-2xl font-bold" style={{ color: accentColor }}>
                  あと{nextStageInfo.pointsNeeded}
                </span>
              </div>

              <div className="space-y-2">
                <div className="h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${stageTheme.hero[0]}55` }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(nextStageInfo.progress, 100)}%`,
                      background: `linear-gradient(90deg, ${accentColor}, ${stageTheme.aura})`
                    }}
                  />
                </div>
                <p className="text-sm" style={{ color: mutedTextColor }}>
                  次の段階「{STAGE_LABELS[nextStageInfo.nextStage]}」へ
                </p>
              </div>
            </div>
          </section>
        )}

        <section
          className="rounded-3xl border p-6 shadow-[0_18px_38px_rgba(81,67,60,0.04)] md:p-8"
          style={{ borderColor, background: dynamicCardBackground }}
        >
          <div className="mb-4 text-center">
            <h3 className="text-lg font-semibold" style={{ color: textColor }}>
              成長シーズンの彩り
            </h3>
            <p className="text-xs md:text-sm" style={{ color: mutedTextColor }}>
              段階ごとに木の世界も色を変えていきます。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {seasonCards.map((season) => (
              <div
                key={season.stage}
                className="rounded-2xl border p-4 transition-shadow"
                style={{
                  borderColor: season.active ? season.theme.accent : `${season.theme.border}`,
                  background: `linear-gradient(140deg, ${season.theme.hero[0]}, ${season.theme.hero[1]})`,
                  boxShadow: season.active ? `0 12px 28px ${season.theme.glow}` : undefined,
                  color: season.theme.text
                }}
              >
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold tracking-wide">
                    {season.label}シーズン
                  </span>
                  {season.active && (
                    <span
                      className="rounded-full px-3 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: `${season.theme.accent}22`, color: season.theme.text }}
                    >
                      NOW
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  {season.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {tree.stage === "guardian" && (
          <section
            className="rounded-3xl border p-6 text-center shadow-lg md:p-8"
            style={{
              borderColor,
              background: dynamicSoftCardBackground
            }}
          >
            <div className="space-y-3">
              <p className="text-2xl">🌟</p>
              <h3 className="text-xl font-bold" style={{ color: textColor }}>
                ゴールの木に到達しました
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: mutedTextColor }}>
                これからは色や光で変化を楽しみながら、より深い心の旅を続けましょう。
              </p>
            </div>
          </section>
        )}

        <section
          className="rounded-3xl border p-6 shadow-[0_18px_38px_rgba(81,67,60,0.04)] md:p-8"
          style={{ borderColor, background: dynamicCardBackground }}
        >
          <h3 className="mb-4 text-center text-lg font-semibold" style={{ color: textColor }}>
            木の成長について
          </h3>
          <div className="space-y-3 text-sm leading-relaxed" style={{ color: mutedTextColor }}>
            <p>
              この木は、あなたが感情日記を書くたびに成長します。
            </p>
            <p>
              感情を選んだり、自己肯定感テストの結果を記録したりすることで、より多く成長します。
            </p>
            <p>
              同じシーズンの中でも、日記を書くたびに空や光の色合いが少しずつ変化し、今日の心模様を映してくれます。
            </p>
            <p>
              木の色や形は、あなただけのものです。誰一人として同じ木は存在しません。
            </p>
            <p className="pt-2 font-medium" style={{ color: textColor }}>
              あなたの感情と向き合い続けることが、この木を育てる唯一の方法です。
            </p>
          </div>
        </section>

        {tree.emotions && tree.emotions.length > 0 && (
          <section
            className="rounded-3xl border p-6 shadow-[0_18px_38px_rgba(81,67,60,0.04)] md:p-8"
            style={{ borderColor, background: dynamicCardBackground }}
          >
            <h3 className="mb-4 text-center text-lg font-semibold" style={{ color: textColor }}>
              よく記録する感情
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {tree.emotions.slice(0, 10).map((emotion) => (
                <div
                  key={emotion.emotion_key}
                  className="rounded-full border px-4 py-2 text-sm"
                  style={{
                    borderColor,
                    background: `linear-gradient(120deg, ${hexToRgba(accentColor, cardTintAlpha * 0.6)}, ${cardBackground})`
                  }}
                >
                  <span className="font-medium" style={{ color: textColor }}>
                    {emotion.emotion_key}
                  </span>
                  <span className="ml-2 text-xs" style={{ color: mutedTextColor }}>
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
