import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/server/supabase";

const extractBearerToken = (request: Request): string | null => {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !value) {
    return null;
  }
  return value;
};

export const authenticateRequest = async (request: Request): Promise<User | null> => {
  const token = extractBearerToken(request);
  if (!token) return null;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    console.error("Supabase auth failed", error?.message);
    return null;
  }

  return data.user;
};
