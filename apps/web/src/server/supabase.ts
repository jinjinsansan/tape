import { createSupabaseServerClient } from "@tape/supabase";
import type { Database } from "@tape/supabase";
import { getPublicSupabaseUrl, getServerEnv } from "@/lib/env";

export const getSupabaseAdminClient = <TDatabase = Database>() => {
  const env = getServerEnv();

  return createSupabaseServerClient<TDatabase>({
    supabaseUrl: getPublicSupabaseUrl(),
    supabaseKey: env.SUPABASE_SERVICE_ROLE_KEY
  });
};
