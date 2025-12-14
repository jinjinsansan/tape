import { z } from "zod";

const serverEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().optional(),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    MICHELLE_ASSISTANT_ID: z.string().optional(),
    MICHELLE_ATTRACTION_ASSISTANT_ID: z.string().optional(),
    USE_SINR_RAG: z.string().optional(),
    MICHELLE_DAILY_DIARY_USER_ID: z.string().uuid().optional(),
    MICHELLE_DAILY_DIARY_MODEL: z.string().optional(),
    ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),
    ADMIN_NOTIFICATION_USER_ID: z.string().uuid().optional(),
    NANO_BANANA_API_URL: z.string().url().optional(),
    NANO_BANANA_API_KEY: z.string().min(1).optional()
  })
  .superRefine((env, ctx) => {
    if (!env.NEXT_PUBLIC_SUPABASE_URL && !env.SUPABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
        message: "Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL"
      });
    }

    if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !env.SUPABASE_ANON_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
        message: "Set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY"
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export const getServerEnv = (): ServerEnv => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    MICHELLE_ASSISTANT_ID: process.env.MICHELLE_ASSISTANT_ID ?? process.env.ASSISTANT_ID,
    MICHELLE_ATTRACTION_ASSISTANT_ID: process.env.MICHELLE_ATTRACTION_ASSISTANT_ID,
    USE_SINR_RAG: process.env.USE_SINR_RAG ?? process.env.NEXT_PUBLIC_USE_SINR_RAG,
    MICHELLE_DAILY_DIARY_USER_ID: process.env.MICHELLE_DAILY_DIARY_USER_ID,
    MICHELLE_DAILY_DIARY_MODEL: process.env.MICHELLE_DAILY_DIARY_MODEL,
    ADMIN_NOTIFICATION_EMAIL: process.env.ADMIN_NOTIFICATION_EMAIL,
    ADMIN_NOTIFICATION_USER_ID: process.env.ADMIN_NOTIFICATION_USER_ID,
    NANO_BANANA_API_URL: process.env.NANO_BANANA_API_URL,
    NANO_BANANA_API_KEY: process.env.NANO_BANANA_API_KEY
  });

  if (!parsed.success) {
    throw new Error(`Invalid server environment configuration: ${parsed.error.message}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
};

export const isResendEnabled = () => Boolean(getServerEnv().RESEND_API_KEY);
export const isTurnstileEnabled = () => Boolean(getServerEnv().TURNSTILE_SECRET_KEY);

export const getPublicSupabaseUrl = () => {
  const env = getServerEnv();
  return env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL!;
};

export const getPublicSupabaseAnonKey = () => {
  const env = getServerEnv();
  return env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY!;
};

export const getOpenAIApiKey = () => {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return env.OPENAI_API_KEY;
};

export const getMichelleAssistantId = () => {
  const env = getServerEnv();
  if (!env.MICHELLE_ASSISTANT_ID) {
    throw new Error("MICHELLE_ASSISTANT_ID (or ASSISTANT_ID) is not configured");
  }
  return env.MICHELLE_ASSISTANT_ID;
};

export const getMichelleAttractionAssistantId = () => {
  const env = getServerEnv();
  if (!env.MICHELLE_ATTRACTION_ASSISTANT_ID) {
    throw new Error("MICHELLE_ATTRACTION_ASSISTANT_ID is not configured");
  }
  return env.MICHELLE_ATTRACTION_ASSISTANT_ID;
};

export const getNanoBananaConfig = () => {
  const env = getServerEnv();
  if (!env.NANO_BANANA_API_URL || !env.NANO_BANANA_API_KEY) {
    throw new Error("NANO_BANANA_API_URL and NANO_BANANA_API_KEY must be configured");
  }
  return {
    apiUrl: env.NANO_BANANA_API_URL,
    apiKey: env.NANO_BANANA_API_KEY
  };
};

export const getMichelleDailyDiaryUserId = () => {
  const env = getServerEnv();
  const userId = env.MICHELLE_DAILY_DIARY_USER_ID;
  if (!userId) {
    throw new Error("MICHELLE_DAILY_DIARY_USER_ID is not configured");
  }
  return userId;
};

export const getAdminNotificationEmail = () => getServerEnv().ADMIN_NOTIFICATION_EMAIL ?? null;

export const getAdminNotificationUserId = () => getServerEnv().ADMIN_NOTIFICATION_USER_ID ?? null;

const toBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return !(normalized === "false" || normalized === "0" || normalized === "no");
};

export const useSinrRag = () => {
  const env = getServerEnv();
  return toBoolean(env.USE_SINR_RAG, true);
};
