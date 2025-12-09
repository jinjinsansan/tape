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
        const { error } = await supabase.auth.getSessionFromUrl({
          storeSession: true,
          url: window.location.href
        });

        if (error) {
          throw error;
        }

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
