import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from "@/lib/env";

type CookieStore = ReturnType<typeof cookies>;

type WritableRequestCookies = CookieStore & {
  set?: (name: string, value: string, options?: Record<string, unknown>) => void;
};

const adaptRouteCookies = (cookieStore: CookieStore) => {
  const base = {
    getAll() {
      return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
    }
  };

  const writable = cookieStore as WritableRequestCookies;
  if (typeof writable.set === "function") {
    return {
      ...base,
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          writable.set?.(name, value, {
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7,
            ...options
          });
        });
      }
    };
  }

  return base;
};

export const createSupabaseRouteClient = <Database = unknown>(
  cookieStore: CookieStore = cookies(),
  requestHeaders?: Headers | HeadersInit
) => {
  const headers = (() => {
    if (!requestHeaders) return undefined;
    if (requestHeaders instanceof Headers) {
      const auth = requestHeaders.get("authorization");
      return auth ? { Authorization: auth } : undefined;
    }
    const maybeAuth = (requestHeaders as Record<string, string | undefined>)["authorization"];
    return maybeAuth ? { Authorization: maybeAuth } : undefined;
  })();

  return createServerClient<Database>(getPublicSupabaseUrl(), getPublicSupabaseAnonKey(), {
    cookies: adaptRouteCookies(cookieStore),
    global: headers ? { headers } : undefined
  });
};
