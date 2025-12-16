"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@tape/supabase";
import { SimpleAuth } from "./simple-auth";
import { SITE_NAME_EN, SITE_NAME_JP } from "@/lib/branding";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium tracking-widest text-gray-500">{SITE_NAME_EN}</p>
            <h1 className="text-3xl font-bold">{SITE_NAME_JP}</h1>
            <p className="text-gray-600">ログインまたは新規登録してください</p>
          </div>
          <SimpleAuth />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
