import { createSupabaseServerClient } from "@tape/supabase";
import { getPublicSupabaseUrl, getServerEnv } from "@/lib/env";

export const getSupabaseAdminClient = () => {
  const env = getServerEnv();

  return createSupabaseServerClient({
    supabaseUrl: getPublicSupabaseUrl(),
    supabaseKey: env.SUPABASE_SERVICE_ROLE_KEY
  });
};
