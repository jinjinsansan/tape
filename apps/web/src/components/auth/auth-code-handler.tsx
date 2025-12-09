"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@tape/supabase";

export function AuthCodeHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      // URLのハッシュとクエリパラメータをチェック
      const hash = window.location.hash;
      const search = window.location.search;
      
      // エラーがある場合は何もしない
      if (search.includes("error=") || hash.includes("error=")) {
        return;
      }

      // codeパラメータまたはaccess_tokenがある場合のみ処理
      const hasCode = search.includes("code=");
      const hasToken = hash.includes("access_token=");
      
      if (!hasCode && !hasToken) {
        return;
      }

      try {
        console.log("[AuthCodeHandler] Checking for session...");
        const supabase = createSupabaseBrowserClient();
        
        // セッションを確認（自動的にURLからトークンを検出）
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[AuthCodeHandler] Session check failed:", error);
          router.replace(`/?error=${encodeURIComponent("認証に失敗しました")}`);
          return;
        }

        if (data.session) {
          console.log("[AuthCodeHandler] Session established successfully");
          // URLをクリーンにしてリロード
          router.replace("/");
        } else {
          console.log("[AuthCodeHandler] No session found, staying on login");
        }
      } catch (err) {
        console.error("[AuthCodeHandler] Unexpected error:", err);
      }
    };

    // 少し遅延させて、URLが完全に更新されるのを待つ
    const timer = setTimeout(handleAuth, 100);
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
