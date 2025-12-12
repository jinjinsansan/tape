"use client";

import { useEffect } from "react";

type Props = {
  code: string;
};

export function ReferralCookieSetter({ code }: Props) {
  useEffect(() => {
    if (!code) return;
    const maxAgeSeconds = 60 * 60 * 24 * 30;
    const expires = new Date(Date.now() + maxAgeSeconds * 1000).toUTCString();
    document.cookie = `tape_referral_code=${encodeURIComponent(code)}; path=/; max-age=${maxAgeSeconds}; expires=${expires}`;
  }, [code]);

  return null;
}
