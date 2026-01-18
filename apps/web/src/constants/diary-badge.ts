export type DiaryBorderTier = {
  threshold: number;
  color: string;
  label: string;
  description: string;
};

export const COUNSELOR_BORDER_COLOR = "#7C55B5";
export const DEFAULT_BORDER_COLOR = "#f0e4d8";

export const DIARY_BORDER_TIERS: DiaryBorderTier[] = [
  { threshold: 3, color: "#F5B1C8", label: "ローズピンク", description: "最初の3件でほんのり色づきます" },
  { threshold: 7, color: "#F6C58E", label: "ピーチオレンジ", description: "1週間の継続で達成" },
  { threshold: 15, color: "#F2D67A", label: "ハニーイエロー", description: "2週間を超えた安定感" },
  { threshold: 30, color: "#BFD8A4", label: "セージグリーン", description: "1か月の節目を記録" },
  { threshold: 50, color: "#8EDFD1", label: "ミントティール", description: "習慣がしっかり定着" },
  { threshold: 100, color: "#8FC6F3", label: "スカイブルー", description: "3桁達成のごほうび" },
  { threshold: 150, color: "#C2B1F4", label: "ラベンダー", description: "振り返りが深まるゾーン" },
  { threshold: 300, color: "#D28BC8", label: "ロイヤルローズ", description: "最上位の300日記" }
];

export const getDiaryTierForCount = (diaryCount: number): DiaryBorderTier | null => {
  if (!Number.isFinite(diaryCount) || diaryCount <= 0) {
    return null;
  }
  let tier: DiaryBorderTier | null = null;
  DIARY_BORDER_TIERS.forEach((candidate) => {
    if (diaryCount >= candidate.threshold) {
      tier = candidate;
    }
  });
  return tier;
};

export const getNextDiaryTier = (diaryCount: number): DiaryBorderTier | null => {
  return DIARY_BORDER_TIERS.find((tier) => tier.threshold > diaryCount) ?? null;
};

export const getDiaryBorderColor = (
  role: string | null | undefined,
  diaryCount: number
): string => {
  if (role === "counselor") {
    return COUNSELOR_BORDER_COLOR;
  }
  const tier = getDiaryTierForCount(diaryCount);
  return tier?.color ?? DEFAULT_BORDER_COLOR;
};
