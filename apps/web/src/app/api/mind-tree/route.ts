import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { getMindTree } from "@/server/services/mind-tree";

const handleAuthError = (error: unknown) => {
  if (error instanceof SupabaseAuthUnavailableError) {
    return NextResponse.json({ error: "Auth temporarily unavailable" }, { status: 503 });
  }
  return null;
};

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore, request.headers);
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : undefined;

  try {
    const user = await getRouteUser(supabase, "Mind tree fetch", accessToken);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tree = await getMindTree(user.id);
    return NextResponse.json({ tree });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) {
      return handled;
    }
    console.error("Failed to fetch mind tree", error);
    return NextResponse.json({ error: "Failed to load mind tree" }, { status: 500 });
  }
}
