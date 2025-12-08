'use client';

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@tape/supabase";

type SupabaseStatusProps = {
  enabled: boolean;
};

export const SupabaseStatus = ({ enabled }: SupabaseStatusProps) => {
  const [status, setStatus] = useState(enabled ? "checking" : "not-configured");

  useEffect(() => {
    if (!enabled) return;

    try {
      createSupabaseBrowserClient();
      setStatus("ready");
    } catch (error) {
      console.error("Supabase client initialization failed", error);
      setStatus("error");
    }
  }, [enabled]);

  return <span className="font-mono text-sm">Supabase: {status}</span>;
};
