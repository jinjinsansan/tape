"use client";

import { useState, FormEvent } from "react";
import { createSupabaseBrowserClient } from "@tape/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      setError("有効なメールアドレスを入力してください");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) {
        throw authError;
      }

      setSent(true);
    } catch (err) {
      console.error("Magic link error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "メール送信に失敗しました。時間を置いて再度お試しください。"
      );
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-2xl border border-tape-green/30 bg-tape-green/10 px-4 py-6">
          <p className="text-sm font-medium text-tape-brown">
            ✉️ メールを送信しました
          </p>
          <p className="mt-2 text-xs text-tape-light-brown">
            <strong>{email}</strong> にログインリンクを送信しました。
            <br />
            メールボックスを確認して、リンクをクリックしてください。
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSent(false);
            setEmail("");
            setLoading(false);
          }}
          className="text-tape-light-brown"
        >
          メールアドレスを変更
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="text-center"
          required
        />
      </div>

      {error && (
        <p className="rounded-lg border border-tape-pink/30 bg-tape-pink/10 px-3 py-2 text-xs text-tape-pink">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} size="lg" className="w-full">
        {loading ? "送信中..." : "ログインリンクを送信"}
      </Button>

      <p className="text-center text-xs text-tape-light-brown">
        メールアドレスにログインリンクを送信します
      </p>
    </form>
  );
}
