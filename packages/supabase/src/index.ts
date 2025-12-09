import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./types";
export type { Database } from "./types";
export type {
  Json,
  TransactionType,
  NotificationChannel,
  DiaryVisibility,
  DiaryCommentSource,
  DiaryReactionType,
  DiaryAiCommentStatus,
  LearningLessonStatus,
  BookingStatus,
  SlotStatus,
  IntroChatStatus
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

const isBrowser = typeof window !== "undefined";

export const createSupabaseBrowserClient = (
  options: SupabaseClientOptions = {}
): SupabaseClient<Database> => {
  const { url, key } = ensureCredentials(
    options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    options.supabaseKey ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY
  );

  if (isBrowser) {
    // 公式パターンに従ったクッキーハンドラー
    return createBrowserClient<Database>(url, key, {
      cookies: {
        getAll() {
          return document.cookie.split('; ').map(cookie => {
            const [name, ...rest] = cookie.split('=')
            return { name, value: rest.join('=') }
          })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieParts = [`${name}=${value}`]
            if (options?.path) cookieParts.push(`path=${options.path}`)
            if (options?.maxAge) cookieParts.push(`max-age=${options.maxAge}`)
            if (options?.domain) cookieParts.push(`domain=${options.domain}`)
            if (options?.sameSite) cookieParts.push(`samesite=${options.sameSite}`)
            if (options?.secure) cookieParts.push('secure')
            document.cookie = cookieParts.join('; ')
          })
        },
      },
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }

  return createClient<Database>(url, key, {
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

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};
