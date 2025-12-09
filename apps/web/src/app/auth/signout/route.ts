import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

const DEFAULT_REDIRECT = "/";

export async function GET(request: NextRequest) {
  const supabase = createSupabaseRouteClient(cookies());
  await supabase.auth.signOut();

  const redirectTo = request.nextUrl.searchParams.get("redirectTo");
  const safeRedirect = redirectTo && redirectTo.startsWith("/") ? redirectTo : DEFAULT_REDIRECT;

  return NextResponse.redirect(new URL(safeRedirect, request.url));
}
