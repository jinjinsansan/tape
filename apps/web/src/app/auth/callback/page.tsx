"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@tape/supabase";

const DEFAULT_REDIRECT = "/";

const safeNextPath = (value: string | null) => {
  if (value && value.startsWith("/")) {
    return value;
  }
  return DEFAULT_REDIRECT;
};

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CallbackClient />
    </Suspense>
  );
}

function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nextPath = useMemo(() => safeNextPath(searchParams.get("next")), [searchParams]);

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();

      try {
        const url = new URL(window.location.href);
        const queryParams = url.searchParams;
        const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : "");

        const reportedError = queryParams.get("error") ?? hashParams.get("error");
        const errorDescription = queryParams.get("error_description") ?? hashParams.get("error_description");

        if (reportedError || errorDescription) {
          throw new Error(errorDescription ?? reportedError ?? "認証がキャンセルされました。");
        }

        const code = queryParams.get("code");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            throw error;
          }
        } else {
          throw new Error("認証レスポンスに code または access_token が含まれていませんでした。");
        }

        window.history.replaceState({}, "", nextPath);
        router.replace(nextPath);
      } catch (error) {
        console.error("Failed to complete OAuth callback", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "認証処理に失敗しました。時間を置いて再度お試しください。"
        );
        setTimeout(() => {
          router.replace(`/login?error=${encodeURIComponent("認証に失敗しました。再度お試しください。")}`);
        }, 2500);
      }
    };

    run();
  }, [nextPath, router]);

  return <LoadingState status={status} errorMessage={errorMessage} />;
}

function LoadingState({
  status = "loading",
  errorMessage
}: {
  status?: "loading" | "error";
  errorMessage?: string | null;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">TAPE AUTH</p>
        <h1 className="text-2xl font-bold text-tape-brown">ログイン処理を完了しています</h1>
        {status === "loading" && <p className="text-sm text-tape-light-brown">しばらくお待ちください...</p>}
        {status === "error" && errorMessage && (
          <p className="text-sm text-tape-pink">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
