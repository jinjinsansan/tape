"use client";

import { createSupabaseBrowserClient } from "@tape/supabase";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <Button onClick={handleSignOut} variant="ghost" size="sm">
      ログアウト
    </Button>
  );
}
