"use client";

import { useCallback, useState } from "react";
import { createSupabaseBrowserClient } from "@tape/supabase";

import { Button } from "@/components/ui/button";

const DEFAULT_REDIRECT_PATH = "/auth/callback";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${DEFAULT_REDIRECT_PATH}`
        }
      });
    } catch (error) {
      console.error("Google sign-in failed", error);
      alert("Googleでのログインに失敗しました。時間を置いて再度お試しください。");
      setLoading(false);
    }
  }, [loading]);

  return (
    <Button onClick={handleSignIn} disabled={loading} size="lg" className="w-full">
      {loading ? "リダイレクト中..." : "Googleでログイン"}
    </Button>
  );
}
