import type { Database } from "@tape/supabase";

export type MindTreeStage = Database["public"]["Enums"]["mind_tree_stage"];

export type TreeShapeVariant = "classic" | "weeping" | "spiral" | "cloud";
export type TreeLeafVariant = "round" | "pointed" | "heart" | "star";

export const MIND_TREE_STAGES: MindTreeStage[] = [
  "seed",
  "sprout",
  "sapling",
  "blooming",
  "fruit_bearing",
  "guardian"
];

type StageTheme = {
  sky: [string, string, string];
  ground: [string, string, string];
  hero: [string, string, string];
  accent: string;
  glow: string;
  particle: string;
  aura: string;
  card: string;
  cardSoft: string;
  border: string;
  text: string;
  mutedText: string;
};

export const STAGE_THEMES: Record<MindTreeStage, StageTheme> = {
  seed: {
    sky: ["#2C2419", "#3D3224", "#4A3D2E"],
    ground: ["#5C4A32", "#4A3C28", "#3D3020"],
    hero: ["#241b11", "#3a2c18", "#5d3a18"],
    accent: "#D4A574",
    glow: "rgba(212, 165, 116, 0.45)",
    particle: "#E8C99B",
    aura: "#F5DEB3",
    card: "rgba(36, 27, 17, 0.55)",
    cardSoft: "rgba(54, 41, 28, 0.35)",
    border: "rgba(244, 216, 188, 0.35)",
    text: "#F4E8DA",
    mutedText: "#C9B7A2"
  },
  sprout: {
    sky: ["#E8F4E8", "#D0ECD0", "#B8E4B8"],
    ground: ["#8FBC8F", "#7CAF7C", "#6A9F6A"],
    hero: ["#f1ffe9", "#d3f5ce", "#bdf0b7"],
    accent: "#50C878",
    glow: "rgba(80, 200, 120, 0.5)",
    particle: "#90EE90",
    aura: "#98FB98",
    card: "rgba(255, 255, 255, 0.78)",
    cardSoft: "rgba(200, 240, 200, 0.35)",
    border: "rgba(66, 153, 104, 0.25)",
    text: "#1d4c2f",
    mutedText: "#4b7354"
  },
  sapling: {
    sky: ["#E0F0E8", "#C8E8D8", "#B0E0C8"],
    ground: ["#6B8E6B", "#5C7F5C", "#4D704D"],
    hero: ["#e9fff2", "#caf3df", "#aee6c9"],
    accent: "#228B22",
    glow: "rgba(34, 139, 34, 0.42)",
    particle: "#7CFC00",
    aura: "#90EE90",
    card: "rgba(255, 255, 255, 0.82)",
    cardSoft: "rgba(200, 235, 210, 0.35)",
    border: "rgba(46, 125, 50, 0.25)",
    text: "#1f3d25",
    mutedText: "#476247"
  },
  blooming: {
    sky: ["#FFF0F5", "#FFE4EC", "#FFD8E4"],
    ground: ["#DDA0DD", "#CC8FCC", "#BB7EB5"],
    hero: ["#fff5fb", "#fdddea", "#f8cade"],
    accent: "#FFB7C5",
    glow: "rgba(255, 183, 197, 0.6)",
    particle: "#FFC0CB",
    aura: "#FFB6C1",
    card: "rgba(255, 255, 255, 0.88)",
    cardSoft: "rgba(254, 235, 244, 0.6)",
    border: "rgba(255, 183, 197, 0.35)",
    text: "#5a2c41",
    mutedText: "#8a5c6d"
  },
  fruit_bearing: {
    sky: ["#FFF8DC", "#FFEFD5", "#FFE4B5"],
    ground: ["#DAA520", "#CD950C", "#B8860B"],
    hero: ["#fff9e6", "#ffe9b8", "#ffd88c"],
    accent: "#FFD700",
    glow: "rgba(255, 215, 0, 0.55)",
    particle: "#FAFAD2",
    aura: "#F0E68C",
    card: "rgba(255, 255, 255, 0.9)",
    cardSoft: "rgba(255, 239, 200, 0.55)",
    border: "rgba(240, 200, 30, 0.35)",
    text: "#5c3500",
    mutedText: "#8a5a1b"
  },
  guardian: {
    sky: ["#0F1628", "#1A2440", "#243058"],
    ground: ["#2E4A62", "#1E3A52", "#0E2A42"],
    hero: ["#0c1828", "#122642", "#1d3960"],
    accent: "#00CED1",
    glow: "rgba(0, 255, 255, 0.4)",
    particle: "#E0FFFF",
    aura: "#7FFFD4",
    card: "rgba(8, 18, 35, 0.7)",
    cardSoft: "rgba(20, 40, 70, 0.6)",
    border: "rgba(127, 255, 212, 0.35)",
    text: "#E6FBFF",
    mutedText: "#98C6CE"
  }
};

const SHAPE_VARIANTS: TreeShapeVariant[] = ["classic", "weeping", "spiral", "cloud"];
const LEAF_VARIANTS: TreeLeafVariant[] = ["round", "pointed", "heart", "star"];

export const getStageIndex = (stage: MindTreeStage) =>
  Math.max(0, MIND_TREE_STAGES.indexOf(stage));

export const getShapeVariant = (value: number): TreeShapeVariant =>
  SHAPE_VARIANTS[value % SHAPE_VARIANTS.length];

export const getLeafVariant = (value: number): TreeLeafVariant =>
  LEAF_VARIANTS[value % LEAF_VARIANTS.length];

export const getRotatedSky = (stage: MindTreeStage, variant: number) => {
  const palette = STAGE_THEMES[stage].sky;
  const offset = variant % palette.length;
  return [palette[offset], palette[(offset + 1) % palette.length], palette[(offset + 2) % palette.length]] as [
    string,
    string,
    string
  ];
};
