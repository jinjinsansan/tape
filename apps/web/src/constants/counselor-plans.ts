import type { Database } from "@tape/supabase";

export type CounselorPlanType = Database["public"]["Enums"]["counselor_plan_type"];

export type CounselorPlanSelection = Record<CounselorPlanType, boolean>;

type PlanConfig = {
  id: CounselorPlanType;
  title: string;
  subtitle: string;
  description: string;
  priceYen: number;
  priceCents: number;
  highlights: string[];
};

const yenToCents = (yen: number) => yen * 100;

export const COUNSELOR_PLAN_CONFIGS: Record<CounselorPlanType, PlanConfig> = {
  single_session: {
    id: "single_session",
    title: "単発カウンセリング",
    subtitle: "60分 / 1回",
    description: "その時の悩みを一度じっくり整理したい方向けのシンプルなプランです。",
    priceYen: 11000,
    priceCents: yenToCents(11000),
    highlights: ["1回60分のオンラインカウンセリング", "気軽に試したい・スポット相談に"]
  },
  monthly_course: {
    id: "monthly_course",
    title: "1ヶ月コース",
    subtitle: "週1回 / 60〜90分",
    description: "4週間継続して伴走しながら、心のテーマを深くケアしていく集中プログラムです。",
    priceYen: 44000,
    priceCents: yenToCents(44000),
    highlights: ["毎週1回の定期セッション", "初回日程から継続的にサポート"]
  }
};

export const DEFAULT_COUNSELOR_PLAN_SELECTION: CounselorPlanSelection = {
  single_session: true,
  monthly_course: false
};

export const normalizePlanSelection = (metadata: unknown): CounselorPlanSelection => {
  const base = { ...DEFAULT_COUNSELOR_PLAN_SELECTION };
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return base;
  }

  const planSettings = (metadata as Record<string, unknown>).plan_settings;
  if (!planSettings || typeof planSettings !== "object" || Array.isArray(planSettings)) {
    return base;
  }

  const typed = planSettings as Partial<Record<CounselorPlanType, unknown>>;
  return {
    single_session: typeof typed.single_session === "boolean" ? typed.single_session : base.single_session,
    monthly_course: typeof typed.monthly_course === "boolean" ? typed.monthly_course : base.monthly_course
  };
};

export const atLeastOnePlanSelected = (selection: CounselorPlanSelection) =>
  selection.single_session || selection.monthly_course;

export const planDisplayLabel = (planType: CounselorPlanType) => {
  const plan = COUNSELOR_PLAN_CONFIGS[planType];
  return `${plan.title} ¥${plan.priceYen.toLocaleString()}`;
};

export const mergePlanSelectionIntoMetadata = (
  metadata: unknown,
  selection: CounselorPlanSelection
): Record<string, unknown> => {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};

  return {
    ...base,
    plan_settings: selection
  };
};
