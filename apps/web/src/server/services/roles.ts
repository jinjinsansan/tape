import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@tape/supabase";
import { getSupabaseAdminClient } from "@/server/supabase";

type Supabase = SupabaseClient<Database>;

const PRIVILEGED_ROLES = new Set(["admin", "counselor"] as const);
type PrivilegedRole = typeof PRIVILEGED_ROLES extends Set<infer T> ? T : never;

export const isPrivilegedRole = (role?: string | null): role is PrivilegedRole =>
  Boolean(role && PRIVILEGED_ROLES.has(role as PrivilegedRole));

export const getUserRole = async (userId: string, supabase: Supabase = getSupabaseAdminClient()) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.role ?? null;
};

export const isPrivilegedUser = async (userId: string, supabase: Supabase = getSupabaseAdminClient()) => {
  const role = await getUserRole(userId, supabase);
  return isPrivilegedRole(role);
};
