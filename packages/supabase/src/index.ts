import { createClient } from "@supabase/supabase-js";

export type SupabaseClientOptions = {
  supabaseUrl?: string;
  supabaseKey?: string;
};

export const createSupabaseBrowserClient = (
  options: SupabaseClientOptions = {}
) => {
  const url = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = options.supabaseKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
};
