import { createSupabaseServerClient } from "@tape/supabase";
import { getServerEnv, getPublicSupabaseUrl } from "@/lib/env";

export const createSupabaseAdminClient = () => {
  const env = getServerEnv();
  return createSupabaseServerClient({
    supabaseUrl: getPublicSupabaseUrl(),
    supabaseKey: env.SUPABASE_SERVICE_ROLE_KEY
  });
};
