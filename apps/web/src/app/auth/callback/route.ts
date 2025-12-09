import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

const DEFAULT_REDIRECT = "/";

const buildRedirect = (request: NextRequest, pathname: string) =>
  NextResponse.redirect(new URL(pathname, request.url));

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const nextParam = url.searchParams.get("next");
  const nextPath = nextParam && nextParam.startsWith("/") ? nextParam : null;

  if (error) {
    return buildRedirect(request, `/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return buildRedirect(request, "/login?error=missing_code");
  }

  const supabase = createSupabaseRouteClient(cookies());
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Failed to exchange code for session", exchangeError);
    return buildRedirect(
      request,
      `/login?error=${encodeURIComponent("認証処理に失敗しました。時間を置いて再度お試しください。")}`
    );
  }

  return buildRedirect(request, nextPath ?? DEFAULT_REDIRECT);
}
