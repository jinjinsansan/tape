"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@tape/supabase";

export function AuthCodeHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    
    if (!code) {
      return;
    }

    const exchangeCode = async () => {
      try {
        console.log("[AuthCodeHandler] Exchanging code for session...");
        const supabase = createSupabaseBrowserClient();
        
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error("[AuthCodeHandler] Exchange failed:", error);
          router.replace(`/?error=${encodeURIComponent("認証に失敗しました: " + error.message)}`);
          return;
        }

        console.log("[AuthCodeHandler] Exchange successful, session:", !!data.session);
        
        // URLからcodeパラメータを削除してリロード
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        router.replace(url.pathname + url.search);
      } catch (err) {
        console.error("[AuthCodeHandler] Unexpected error:", err);
        router.replace("/?error=認証処理中にエラーが発生しました");
      }
    };

    exchangeCode();
  }, [searchParams, router]);

  return null;
}
