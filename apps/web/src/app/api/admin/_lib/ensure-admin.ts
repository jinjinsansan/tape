import { NextResponse } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@tape/supabase";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { getAdminNotificationEmail, getAdminNotificationUserId } from "@/lib/env";
import { getSupabaseAdminClient } from "@/server/supabase";

type RouteClient = SupabaseClient<Database>;

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? null;

const allowlistedAdmin = (() => {
  const email = normalize(getAdminNotificationEmail());
  const userId = getAdminNotificationUserId() ?? null;
  return { email, userId };
})();

const promoteToAdminIfNeeded = async (userId: string) => {
  try {
    const adminClient = getSupabaseAdminClient();
    await adminClient.from("profiles").update({ role: "admin" }).eq("id", userId);
  } catch (error) {
    console.error("Failed to promote allowlisted admin", error);
  }
};

const isAllowlistedAdmin = (user: { id: string; email?: string | null }) => {
  if (allowlistedAdmin.userId && user.id === allowlistedAdmin.userId) {
    return true;
  }
  if (allowlistedAdmin.email && normalize(user.email) === allowlistedAdmin.email) {
    return true;
  }
  return false;
};

export const ensureAdmin = async (supabase: RouteClient, context: string) => {
  try {
    const user = await getRouteUser(supabase, context);
    if (!user) {
      return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
    }

    if (isAllowlistedAdmin(user)) {
      await promoteToAdminIfNeeded(user.id);
      return { response: null, user };
    }

    const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

    if (error || !profile) {
      console.error(`[${context}] Failed to load profile`, error);
      return { response: NextResponse.json({ error: "Profile not found" }, { status: 500 }), user: null };
    }

    if (profile.role !== "admin") {
      if (isAllowlistedAdmin(user)) {
        await promoteToAdminIfNeeded(user.id);
        return { response: null, user };
      }
      return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
    }

    return { response: null, user };
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return {
        response: NextResponse.json(
          { error: "Authentication service is temporarily unavailable. Please try again later." },
          { status: 503 }
        ),
        user: null
      };
    }
    throw error;
  }
};
