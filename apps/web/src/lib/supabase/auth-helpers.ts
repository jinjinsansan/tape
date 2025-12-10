import type { SupabaseClient } from "@supabase/supabase-js";

export class SupabaseAuthUnavailableError extends Error {
  constructor(public readonly context: string, public readonly originalError: unknown) {
    super(`Supabase auth unavailable: ${context}`);
    this.name = "SupabaseAuthUnavailableError";
  }
}

export const getRouteUser = async <Database>(
  supabase: SupabaseClient<Database>,
  context: string,
  accessToken?: string
) => {
  try {
    console.log(`[${context}] Auth attempt with token:`, accessToken ? "Bearer token provided" : "Using cookies");
    const { data, error } = accessToken
      ? await supabase.auth.getUser(accessToken)
      : await supabase.auth.getUser();
    if (error) {
      console.warn(`[${context}] Supabase auth warning:`, error.message);
    }
    console.log(`[${context}] Auth result:`, data.user ? `User ${data.user.id}` : "No user");
    return data.user;
  } catch (error) {
    console.error(`[${context}] Supabase auth error`, error);
    throw new SupabaseAuthUnavailableError(context, error);
  }
};
