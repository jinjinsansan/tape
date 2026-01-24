"use client";

import { useMemo } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import {
  getLeafVariant,
  getRotatedSky,
  getShapeVariant,
  getStageIndex,
  STAGE_THEMES,
  type MindTreeStage,
  type TreeLeafVariant,
  type TreeShapeVariant
} from "./theme";

type TreeCanvasProps = {
  stage: MindTreeStage;
  primaryColor: string;
  secondaryColor: string;
  backgroundVariant?: number;
  shapeVariant?: number;
  leafVariant?: number;
  colorCycle?: number;
  className?: string;
};

type Branch = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  controlX: number;
  controlY: number;
  thickness: number;
  depth: number;
  delay: number;
};

type FoliageItem = {
  x: number;
  y: number;
  size: number;
  rotation: number;
  delay: number;
  type: "leaf" | "flower" | "fruit";
  hue: number;
  brightness: number;
};

const stageConfig = {
  canopy: [30, 36, 44, 52, 60, 70],
  trunk: [40, 55, 70, 85, 92, 100],
  leafClusters: [3, 5, 80, 120, 140, 180],
  glow: [0.08, 0.12, 0.2, 0.3, 0.35, 0.45]
};

const resolveColor = (value: string | undefined, fallback: string) =>
  value && value.trim().length > 0 ? value : fallback;

export function TreeCanvas({
  stage,
  primaryColor,
  secondaryColor,
  backgroundVariant = 0,
  shapeVariant = 0,
  leafVariant = 0,
  colorCycle = 0,
  className
}: TreeCanvasProps) {
  const stageIndex = getStageIndex(stage);
  const theme = STAGE_THEMES[stage];
  const shape = getShapeVariant(shapeVariant + colorCycle);
  const leafShape = getLeafVariant(leafVariant + colorCycle);
  const skyPalette = getRotatedSky(stage, backgroundVariant + colorCycle);
  const trunkColor = resolveColor(primaryColor, theme.accent);
  const canopyColor = resolveColor(secondaryColor, theme.aura);
  const hueShift = (colorCycle % 24) * 5;

  const branches = useMemo(() => {
    if (stageIndex < 2) {
      return [] as Branch[];
    }

    const result: Branch[] = [];
    const maxDepth = [0, 0, 4, 6, 7, 9][stageIndex];
    const branchLength = [0, 0, 52, 60, 74, 88][stageIndex];

    function generateBranch(
      x: number,
      y: number,
      angle: number,
      length: number,
      thickness: number,
      depth: number,
      delay: number
    ) {
      if (depth > maxDepth || length < 10) {
        return;
      }

      const bendAmount = shape === "weeping" ? 0.22 : shape === "spiral" ? 0.12 : 0.08;
      const actualAngle = angle + (Math.random() - 0.5) * 0.4;
      const endX = x + Math.sin(actualAngle) * length;
      const endY = y - Math.cos(actualAngle) * length;
      const controlX = x + Math.sin(actualAngle) * length * 0.5 + (Math.random() - 0.5) * length * bendAmount;
      const controlY = y - Math.cos(actualAngle) * length * 0.5;

      result.push({
        x1: x,
        y1: y,
        x2: endX,
        y2: endY,
        controlX,
        controlY,
        thickness: Math.max(1.5, thickness),
        depth,
        delay: delay + depth * 0.05
      });

      const branchCount = shape === "cloud" ? 3 : 2;
      const spread = shape === "weeping" ? 1 : shape === "spiral" ? 0.55 : 0.65;

      for (let i = 0; i < branchCount; i += 1) {
        const childAngle =
          actualAngle + (i - (branchCount - 1) / 2) * spread + (shape === "spiral" ? depth * 0.2 * (depth % 2 ? 1 : -1) : 0);
        const lengthFactor = 0.68 + Math.random() * 0.15;
        const thicknessFactor = 0.64 + Math.random() * 0.12;

        generateBranch(
          endX,
          endY,
          childAngle,
          length * lengthFactor,
          thickness * thicknessFactor,
          depth + 1,
          delay + 0.03
        );
      }
    }

    generateBranch(250, 420, 0, branchLength, 12 + stageIndex * 3, 0, 0);
    generateBranch(250, 395, -0.28, branchLength * 0.8, 10 + stageIndex * 2, 1, 0.05);
    generateBranch(250, 395, 0.28, branchLength * 0.8, 10 + stageIndex * 2, 1, 0.1);

    if (stageIndex >= 4) {
      generateBranch(250, 370, -0.5, branchLength * 0.75, 8 + stageIndex, 2, 0.18);
      generateBranch(250, 370, 0.5, branchLength * 0.75, 8 + stageIndex, 2, 0.22);
    }

    return result;
  }, [shape, stageIndex]);

  const foliage = useMemo(() => {
    if (stageIndex < 2) {
      return [] as FoliageItem[];
    }

    const counts = [0, 0, 90, 150, 140, 190];
    const count = counts[stageIndex];
    const endpoints = branches.slice(-Math.max(10, Math.floor(branches.length * 0.5)));

    return Array.from({ length: count }, (_, i) => {
      const anchor = endpoints[i % endpoints.length] ?? { x2: 250, y2: 220 };
      const spread = stageIndex >= 4 ? 42 : 32;

      return {
        x: (anchor as Branch).x2 + (Math.random() - 0.5) * spread * 2,
        y: (anchor as Branch).y2 + (Math.random() - 0.5) * spread * 1.4 - 12,
        size:
          stageIndex === 3
            ? 12 + Math.random() * 10
            : stageIndex === 4
              ? 9 + Math.random() * 8
              : stageIndex === 5
                ? 8 + Math.random() * 11
                : 7 + Math.random() * 8,
        rotation: Math.random() * 360,
        delay: Math.random() * 2,
        type: stageIndex === 3 ? "flower" : stageIndex === 4 ? "fruit" : "leaf",
        hue: Math.random() * 40 - 20,
        brightness: 0.85 + Math.random() * 0.3
      } satisfies FoliageItem;
    });
  }, [branches, stageIndex]);

  const particles = useMemo(() => {
    const counts = [10, 15, 20, 35, 45, 70];
    const count = counts[stageIndex];
    return Array.from({ length: count }, () => ({
      x: 40 + Math.random() * 420,
      y: stageIndex < 2 ? 260 + Math.random() * 120 : 60 + Math.random() * 320,
      size: stageIndex === 5 ? 2.5 + Math.random() * 4.5 : 1.5 + Math.random() * 3,
      delay: Math.random() * 4,
      duration: 4 + Math.random() * 5
    }));
  }, [stageIndex]);

  const canopyRadius = stageConfig.canopy[stageIndex] + (shapeVariant % 6);
  const trunkHeight = stageConfig.trunk[stageIndex];

  return (
    <div
      className={cn("relative aspect-[4/5] w-full overflow-hidden rounded-[32px]", className)}
      style={{ filter: `hue-rotate(${hueShift}deg)` }}
    >
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="emotion-tree-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={skyPalette[0]} />
            <stop offset="50%" stopColor={skyPalette[1]} />
            <stop offset="100%" stopColor={skyPalette[2]} />
          </linearGradient>
          <linearGradient id="emotion-tree-ground" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.ground[0]} />
            <stop offset="50%" stopColor={theme.ground[1]} />
            <stop offset="100%" stopColor={theme.ground[2]} />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#emotion-tree-sky)" />
        <rect y="65%" width="100%" height="35%" fill="url(#emotion-tree-ground)" opacity={0.85} />
      </svg>

      {particles.map((particle, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full"
          style={{
            width: particle.size * 2,
            height: particle.size * 2,
            top: `${(particle.y / 500) * 100}%`,
            left: `${(particle.x / 500) * 100}%`,
            background: theme.particle,
            boxShadow: `0 0 ${particle.size * 4}px ${theme.particle}`
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.9, 0],
            y: stageIndex < 2 ? [0, -10, 0] : [-6, 6, -6]
          }}
          transition={{
            delay: particle.delay,
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}

      <svg viewBox="0 0 500 500" className="relative block w-full"> 
        <defs>
          <linearGradient id="emotion-tree-trunk" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={trunkColor} stopOpacity={0.85} />
            <stop offset="100%" stopColor={trunkColor} stopOpacity={1} />
          </linearGradient>
          <radialGradient id="emotion-tree-canopy" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={canopyColor} stopOpacity={0.85} />
            <stop offset="100%" stopColor={canopyColor} stopOpacity={0.5} />
          </radialGradient>
        </defs>

        <g className="origin-center">
          <motion.path
            d={`M 240 ${450} 
                Q 250 ${450 - trunkHeight * 0.45} 250 ${450 - trunkHeight} 
                Q 250 ${450 - trunkHeight - 20} 260 ${450 - trunkHeight} 
                Q 262 ${430 - trunkHeight * 0.4} 258 ${450}
                Z`}
            fill="url(#emotion-tree-trunk)"
            initial={{ rotate: 0 }}
            animate={{ rotate: stageIndex >= 2 ? [0.4, -0.4, 0.4] : [0.2, -0.2, 0.2] }}
            transition={{ duration: stageIndex >= 2 ? 6 : 8, repeat: Infinity, ease: "easeInOut" }}
          />

          {branches.map((branch, index) => (
            <motion.path
              key={`branch-${index}`}
              d={`M ${branch.x1} ${branch.y1} Q ${branch.controlX} ${branch.controlY} ${branch.x2} ${branch.y2}`}
              stroke={trunkColor}
              strokeWidth={branch.thickness}
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.9 }}
              transition={{ duration: 1.5, delay: branch.delay, ease: "easeOut" }}
              style={{ opacity: 0.85 }}
            />
          ))}

          <motion.circle
            cx="250"
            cy={450 - trunkHeight}
            r={canopyRadius + 8}
            fill="url(#emotion-tree-canopy)"
            initial={{ scale: 0.95, opacity: 0.8 }}
            animate={{ scale: [0.96, 1.02, 0.96], opacity: [0.78, 0.92, 0.78] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {foliage.map((item, index) => (
            <motion.g
              key={`foliage-${index}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0.92, 1.08, 0.92],
                opacity: [0.7, 0.95, 0.7],
                rotate: [item.rotation - 4, item.rotation + 4, item.rotation - 4]
              }}
              transition={{ duration: 3.8 + Math.random() * 1.5, delay: item.delay, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: `${item.x}px ${item.y}px` }}
            >
              {renderFoliage(item, stageIndex, leafShape)}
            </motion.g>
          ))}

          {stageIndex >= 3 && (
            <motion.circle
              cx="250"
              cy={450 - trunkHeight - canopyRadius * 0.2}
              r={canopyRadius + 20}
              fill={theme.glow}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.2, stageConfig.glow[stageIndex], 0.2], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </g>
      </svg>
    </div>
  );
}

const renderFoliage = (item: FoliageItem, stageIndex: number, shape: TreeLeafVariant) => {
  if (item.type === "flower") {
    return (
      <g>
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse
            key={angle}
            cx={item.x + Math.cos((angle + item.rotation) * Math.PI / 180) * item.size * 0.55}
            cy={item.y + Math.sin((angle + item.rotation) * Math.PI / 180) * item.size * 0.55}
            rx={item.size * 0.7}
            ry={item.size * 0.42}
            fill={`hsla(${345 + item.hue}, 75%, ${75 * item.brightness}%, 0.9)`}
            opacity={0.92}
          />
        ))}
        <circle cx={item.x} cy={item.y} r={item.size * 0.25} fill="#FFE066" />
        <circle cx={item.x} cy={item.y} r={item.size * 0.12} fill="#FFF8DC" opacity={0.8} />
      </g>
    );
  }

  if (item.type === "fruit") {
    return (
      <g>
        <circle cx={item.x} cy={item.y} r={item.size * 1.2} fill="rgba(255, 215, 0, 0.35)" />
        <circle cx={item.x} cy={item.y} r={item.size} fill={`hsl(${48 + item.hue}, 80%, ${62 * item.brightness}%)`} />
        <ellipse
          cx={item.x - item.size * 0.32}
          cy={item.y - item.size * 0.32}
          rx={item.size * 0.28}
          ry={item.size * 0.18}
          fill="white"
          opacity={0.75}
        />
      </g>
    );
  }

  const baseColor =
    stageIndex === 5
      ? `hsl(${175 + item.hue}, 55%, ${55 * item.brightness}%)`
      : `hsl(${125 + item.hue}, 60%, ${48 * item.brightness}%)`;

  const leafPath = (() => {
    if (shape === "heart") {
      return `M ${item.x} ${item.y - item.size * 0.8}
        C ${item.x - item.size} ${item.y - item.size * 1.2} ${item.x - item.size} ${item.y} ${item.x} ${item.y + item.size * 0.5}
        C ${item.x + item.size} ${item.y} ${item.x + item.size} ${item.y - item.size * 1.2} ${item.x} ${item.y - item.size * 0.8}`;
    }
    if (shape === "star") {
      return (
        Array.from({ length: 5 }, (_, i) => {
          const angle = (i * 72 - 90) * (Math.PI / 180);
          const innerAngle = (i * 72 + 36 - 90) * (Math.PI / 180);
          return `${i === 0 ? "M" : "L"} ${item.x + Math.cos(angle) * item.size} ${item.y + Math.sin(angle) * item.size}
            L ${item.x + Math.cos(innerAngle) * item.size * 0.4} ${item.y + Math.sin(innerAngle) * item.size * 0.4}`;
        }).join(" ") + " Z"
      );
    }
    if (shape === "pointed") {
      return `M ${item.x} ${item.y - item.size}
        Q ${item.x + item.size * 0.5} ${item.y} ${item.x} ${item.y + item.size}
        Q ${item.x - item.size * 0.5} ${item.y} ${item.x} ${item.y - item.size}`;
    }
    return `M ${item.x - item.size * 0.7} ${item.y}
      Q ${item.x} ${item.y - item.size} ${item.x + item.size * 0.7} ${item.y}
      Q ${item.x} ${item.y + item.size} ${item.x - item.size * 0.7} ${item.y}`;
  })();

  return <path d={leafPath} fill={baseColor} opacity={0.9} />;
};

TreeCanvas.displayName = "TreeCanvas";
