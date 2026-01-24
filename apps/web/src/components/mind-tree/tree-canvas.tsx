import type { ReactNode } from "react";

import type { Database } from "@tape/supabase";

import { cn } from "@/lib/utils";

type MindTreeStage = Database["public"]["Enums"]["mind_tree_stage"];

const STAGE_ORDER: MindTreeStage[] = [
  "seed",
  "sprout",
  "sapling",
  "blooming",
  "fruit_bearing",
  "guardian"
];

const STAGE_CONFIG: Record<MindTreeStage, { canopy: number; trunkHeight: number; leafClusters: number; glow: number }> = {
  seed: { canopy: 28, trunkHeight: 40, leafClusters: 3, glow: 0.1 },
  sprout: { canopy: 34, trunkHeight: 55, leafClusters: 5, glow: 0.15 },
  sapling: { canopy: 40, trunkHeight: 70, leafClusters: 7, glow: 0.2 },
  blooming: { canopy: 48, trunkHeight: 85, leafClusters: 9, glow: 0.28 },
  fruit_bearing: { canopy: 54, trunkHeight: 92, leafClusters: 11, glow: 0.33 },
  guardian: { canopy: 60, trunkHeight: 98, leafClusters: 13, glow: 0.4 }
};

const BACKGROUND_GRADIENTS = [
  ["#fff9f5", "#fef6ff"],
  ["#f2fbff", "#fff8f8"],
  ["#f4f8ff", "#fff6ef"],
  ["#fef7fb", "#f3fdf6"],
  ["#f2f5ff", "#fff0f5"],
  ["#f9fff4", "#f4f7ff"]
];

const canopyOpacityByStage: Record<MindTreeStage, number> = {
  seed: 0.55,
  sprout: 0.6,
  sapling: 0.65,
  blooming: 0.72,
  fruit_bearing: 0.78,
  guardian: 0.85
};

type TreeCanvasProps = {
  stage: MindTreeStage;
  primaryColor: string;
  secondaryColor: string;
  backgroundVariant?: number;
  shapeVariant?: number;
  leafVariant?: number;
  className?: string;
};

const createLeafNodes = (count: number, variant: number) => {
  const nodes: { cx: number; cy: number; scale: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = ((index + variant) / count) * Math.PI * 2;
    const radius = 24 + (variant % 7);
    const cx = 80 + Math.cos(angle) * radius;
    const cy = 90 + Math.sin(angle) * (radius * 0.7);
    nodes.push({ cx, cy, scale: 0.8 + (index % 3) * 0.1 });
  }
  return nodes;
};

const StageSparkles = ({ stage }: { stage: MindTreeStage }) => {
  if (STAGE_ORDER.indexOf(stage) < 3) {
    return null;
  }
  const sparkles: ReactNode[] = [];
  const count = 3 + STAGE_ORDER.indexOf(stage);
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const x = 80 + Math.cos(angle) * 55;
    const y = 60 + Math.sin(angle) * 30;
    sparkles.push(
      <circle key={`sparkle-${i}`} cx={x} cy={y} r={2.4} fill="white" opacity={0.35} />
    );
  }
  return <>{sparkles}</>;
};

export const TreeCanvas = ({
  stage,
  primaryColor,
  secondaryColor,
  backgroundVariant,
  shapeVariant,
  leafVariant,
  className
}: TreeCanvasProps) => {
  const stageConfig = STAGE_CONFIG[stage];
  const gradient = BACKGROUND_GRADIENTS[backgroundVariant ? backgroundVariant % BACKGROUND_GRADIENTS.length : 0];
  const canopyOpacity = canopyOpacityByStage[stage];
  const leafNodes = createLeafNodes(stageConfig.leafClusters, leafVariant ?? 0);
  const trunkWidth = 12 + (shapeVariant ?? 0) % 6;
  const canopyRadius = stageConfig.canopy + ((shapeVariant ?? 0) % 6);
  const isLarge = STAGE_ORDER.indexOf(stage) >= 3;

  return (
    <svg
      viewBox="0 0 160 200"
      className={cn(
        "w-full max-w-full overflow-visible transition-transform duration-500 hover:scale-105 cursor-pointer",
        className
      )}
      role="img"
      aria-label={`Mind tree stage ${stage}`}
    >
      <defs>
        <linearGradient id="mind-tree-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={gradient[0]} />
          <stop offset="100%" stopColor={gradient[1]} />
        </linearGradient>
        <linearGradient id="mind-tree-trunk" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity={0.8} />
          <stop offset="100%" stopColor={primaryColor} stopOpacity={1} />
        </linearGradient>
        <radialGradient id="mind-tree-canopy" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={secondaryColor} stopOpacity={canopyOpacity + 0.1} />
          <stop offset="100%" stopColor={secondaryColor} stopOpacity={canopyOpacity} />
        </radialGradient>
        <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect 
        width="160" 
        height="200" 
        rx="32" 
        fill="url(#mind-tree-bg)" 
        className="transition-colors duration-1000" 
      />

      <ellipse cx="80" cy="175" rx="45" ry="14" fill="#000" opacity={0.07} className="animate-pulse" />

      <g className={cn("origin-bottom", isLarge ? "animate-sway-slow" : "animate-sway-medium")}>
        <path
          d={`M ${80 - trunkWidth / 2} ${180} 
              Q ${80} ${180 - stageConfig.trunkHeight * 0.5} ${80} ${180 - stageConfig.trunkHeight} 
              Q ${80} ${180 - stageConfig.trunkHeight - 18} ${80 + trunkWidth / 2} ${180 - stageConfig.trunkHeight} 
              Q ${80 + trunkWidth * 0.2} ${180 - stageConfig.trunkHeight * 0.5} ${80 + trunkWidth / 2} ${180} Z`}
          fill="url(#mind-tree-trunk)"
          className="transition-all duration-1000 ease-out hover:brightness-110"
        />

        <g className="animate-leaf-breathe origin-center group">
          <circle 
            cx="80" 
            cy={180 - stageConfig.trunkHeight} 
            r={canopyRadius} 
            fill="url(#mind-tree-canopy)" 
            className="transition-all duration-1000 ease-out group-hover:brightness-105"
            filter={isLarge ? "url(#glow-filter)" : undefined}
          />

          {leafNodes.map((leaf, index) => (
            <circle
              key={`${leaf.cx}-${index}`}
              cx={leaf.cx}
              cy={leaf.cy}
              r={6 * leaf.scale}
              fill={secondaryColor}
              opacity={0.4 + (index % 4) * 0.08}
              className="animate-leaf-breathe transition-transform hover:scale-110 duration-300"
              style={{ animationDelay: `${index * 0.2}s` }}
            />
          ))}
        </g>
      </g>

      {isLarge && (
        <circle 
          cx="80" 
          cy="90" 
          r={canopyRadius + 6} 
          fill={secondaryColor} 
          opacity={stageConfig.glow} 
          className="animate-glow"
          filter="url(#glow-filter)"
        />
      )}

      <StageSparkles stage={stage} />
    </svg>
  );
};

TreeCanvas.displayName = "TreeCanvas";
