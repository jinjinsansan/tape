import type { Database } from "@tape/supabase";

import { cn } from "@/lib/utils";

import { TreeCanvas } from "./tree-canvas";

type MindTreeStage = Database["public"]["Enums"]["mind_tree_stage"];

const STAGE_LABELS: Record<MindTreeStage, string> = {
  seed: "Seed",
  sprout: "Sprout",
  sapling: "Sapling",
  blooming: "Bloom",
  fruit_bearing: "Fruit",
  guardian: "Goal Tree"
};

type MindTreeBadgeProps = {
  stage: MindTreeStage;
  primaryColor: string;
  secondaryColor: string;
  backgroundVariant?: number;
  shapeVariant?: number;
  leafVariant?: number;
  className?: string;
};

export const MindTreeBadge = ({
  stage,
  primaryColor,
  secondaryColor,
  backgroundVariant,
  shapeVariant,
  leafVariant,
  className
}: MindTreeBadgeProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-[0_8px_24px_rgba(81,67,60,0.08)]",
        className
      )}
    >
      <div className="h-14 w-12 overflow-hidden rounded-xl">
        <TreeCanvas
          stage={stage}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          backgroundVariant={backgroundVariant}
          shapeVariant={shapeVariant}
          leafVariant={leafVariant}
          className="h-full w-full"
        />
      </div>
      <div className="flex flex-col text-xs font-medium text-[#5c4c45]">
        <span className="uppercase tracking-[0.2em] text-[10px] text-[#b29f95]">Mind Tree</span>
        <span className="text-sm font-semibold text-[#4b3b34]">{STAGE_LABELS[stage]}</span>
      </div>
    </div>
  );
};

MindTreeBadge.displayName = "MindTreeBadge";
