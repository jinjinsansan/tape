import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tape/supabase";

import { getSupabaseAdminClient } from "@/server/supabase";

const SALES_SETTINGS_KEY = "michelle_sales_settings";
const salesSettingsSchema = z.object({
  psychologyEnabled: z.boolean().default(false),
  attractionEnabled: z.boolean().default(false)
});

export type MichelleSalesSettings = z.infer<typeof salesSettingsSchema>;

const DEFAULT_SALES_SETTINGS: MichelleSalesSettings = salesSettingsSchema.parse({});

export const MIN_ASSISTANT_MESSAGES_FOR_PROMO = 10;
export const SALES_PROMO_INTERVAL = 50;

const PROMO_SEPARATOR = "────────────────────";
const PROMO_PREFIX = "\n\n";

export const PSYCHOLOGY_PROMO_COPY = [
  PROMO_SEPARATOR,
  "🎥 動画コース: テープ式心理カウンセラー育成講座",
  "ガムテープ（思い込み）の見つけ方から解放ワークまでを体系的に学べる59,800円の本格プログラムです。動画とワークシートで『寄り添うだけで終わらない』問いかけ力を鍛えられます。",
  "https://tape.app/courses/counselor-training",
  PROMO_SEPARATOR
].join("\n");

export const ATTRACTION_PROMO_COPY = [
  PROMO_SEPARATOR,
  "🎥 動画コース: 引き寄せ講座Permit",
  "感情と波長を揃えながら望む現実をデザインする全カリキュラムを、実践ステップと課題付きで学べます。ミシェル引き寄せチャットと同じ先生の指導をフルで体験できます。",
  "https://tape.app/courses/attraction-permit",
  PROMO_SEPARATOR
].join("\n");

const appendPromoBlock = (copy: string) => `${PROMO_PREFIX}${copy}`;

export async function getMichelleSalesSettings(): Promise<MichelleSalesSettings> {
  const supabase = getSupabaseAdminClient<Database>();
  const { data, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", SALES_SETTINGS_KEY)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  const parsed = salesSettingsSchema.safeParse(data?.value ?? {});
  return parsed.success ? parsed.data : DEFAULT_SALES_SETTINGS;
}

export async function updateMichelleSalesSettings(settings: MichelleSalesSettings) {
  const supabase = getSupabaseAdminClient<Database>();
  await supabase.from("admin_settings").upsert({
    key: SALES_SETTINGS_KEY,
    value: settings,
    updated_at: new Date().toISOString()
  });
}

const shouldAppendPromo = async (
  supabase: SupabaseClient<Database>,
  table: "michelle_messages" | "michelle_attraction_messages",
  sessionId: string
) => {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("role", "assistant");

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  const nextAssistantTurn = (count ?? 0) + 1;
  return (
    nextAssistantTurn >= MIN_ASSISTANT_MESSAGES_FOR_PROMO &&
    nextAssistantTurn % SALES_PROMO_INTERVAL === 0
  );
};

const resolvePromoAppendix = async (
  supabase: SupabaseClient<Database>,
  sessionId: string,
  target: "psychology" | "attraction"
) => {
  const settings = await getMichelleSalesSettings();
  const enabled =
    target === "psychology" ? settings.psychologyEnabled : settings.attractionEnabled;

  if (!enabled) {
    return null;
  }

  const table = target === "psychology" ? "michelle_messages" : "michelle_attraction_messages";
  const allowed = await shouldAppendPromo(supabase, table, sessionId);

  if (!allowed) {
    return null;
  }

  const copy = target === "psychology" ? PSYCHOLOGY_PROMO_COPY : ATTRACTION_PROMO_COPY;
  return appendPromoBlock(copy);
};

export const resolvePsychologyPromoAppendix = (
  supabase: SupabaseClient<Database>,
  sessionId: string
) => resolvePromoAppendix(supabase, sessionId, "psychology");

export const resolveAttractionPromoAppendix = (
  supabase: SupabaseClient<Database>,
  sessionId: string
) => resolvePromoAppendix(supabase, sessionId, "attraction");
