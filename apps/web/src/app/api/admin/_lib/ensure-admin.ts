import { NextResponse } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@tape/supabase";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";

type RouteClient = SupabaseClient<Database>;

export const ensureAdmin = async (supabase: RouteClient, context: string) => {
  try {
    const user = await getRouteUser(supabase, context);
    if (!user) {
      return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
    }

    const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

    if (error || !profile) {
      console.error(`[${context}] Failed to load profile`, error);
      return { response: NextResponse.json({ error: "Profile not found" }, { status: 500 }), user: null };
    }

    if (profile.role !== "admin") {
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
