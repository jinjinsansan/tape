import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
export type { Database } from "./types";
export type {
  Json,
  TransactionType,
  NotificationChannel,
  NotificationCategory,
  DiaryVisibility,
  DiaryCommentSource,
  DiaryReactionType,
  DiaryAiCommentStatus,
  DiaryAssessmentAgePath,
  LearningLessonStatus,
  BookingStatus,
  SlotStatus,
  IntroChatStatus,
  CounselorPlanType,
  PointAction,
  PointRedemptionStatus
} from "./types";

export type SupabaseClientOptions = {
  supabaseUrl?: string;
  supabaseKey?: string;
};

const ensureCredentials = (
  url: string | undefined,
  key: string | undefined
): { url: string; key: string } => {
  if (!url || !key) {
    throw new Error("Missing Supabase credentials");
  }

  return { url, key };
};

export const createSupabaseBrowserClient = (
  options: SupabaseClientOptions = {}
): SupabaseClient<Database> => {
  const { url, key } = ensureCredentials(
    options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    options.supabaseKey ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY
  );

  return createBrowserClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
};

export const createSupabaseServerClient = (
  options: SupabaseClientOptions = {}
): SupabaseClient<Database> => {
  const { url, key } = ensureCredentials(
    options.supabaseUrl ?? process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    options.supabaseKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // noop - service role client doesn't need cookies
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};
