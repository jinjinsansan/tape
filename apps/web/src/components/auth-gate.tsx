"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@tape/supabase";
import { SimpleAuth } from "./simple-auth";
import { SITE_NAME_EN, SITE_NAME_JP, SITE_TITLE_FONT_CLASS } from "@/lib/branding";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

type AuthGateProps = {
  children: React.ReactNode;
  initialUser?: User | null;
};

export function AuthGate({ children, initialUser = null }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [sessionResolved, setSessionResolved] = useState(Boolean(initialUser));

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    const resolveSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setUser(data.session?.user ?? null);
      } finally {
        if (!cancelled) {
          setSessionResolved(true);
        }
      }
    };

    resolveSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setSessionResolved(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (!sessionResolved) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-full flex-col bg-gradient-to-b from-[#fffaf4] via-[#f9f3ff] to-[#f2fbff]">
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-md space-y-8 bg-white/90 p-6 rounded-3xl shadow-[0_18px_38px_rgba(81,67,60,0.08)]">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium tracking-[0.4em] text-[#92b4d6]">{SITE_NAME_EN}</p>
              <h1 className={cn("text-3xl text-[#51433c]", SITE_TITLE_FONT_CLASS)}>{SITE_NAME_JP}</h1>
              <p className="text-[#8b7a71]">ログインまたは新規登録してください</p>
            </div>
            <SimpleAuth />
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return <>{children}</>;
}
