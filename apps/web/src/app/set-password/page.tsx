"use client";

import { useState, FormEvent } from "react";
import { createSupabaseBrowserClient } from "@tape/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!password || password.length < 6) {
      setMessage({ type: "error", text: "パスワードは6文字以上で入力してください" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      
      // 現在のユーザーを確認
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("ログインしてください");
      }

      // パスワードを設定
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setMessage({
        type: "success",
        text: "パスワードを設定しました！次回からメールアドレスとパスワードでログインできます。"
      });
      setPassword("");
    } catch (err: any) {
      console.error("Set password error:", err);
      setMessage({ 
        type: "error", 
        text: err.message || "パスワードの設定に失敗しました" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-4 py-20">
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">TAPE AUTH</p>
        <h1 className="text-3xl font-bold text-tape-brown">パスワード設定</h1>
        <p className="text-sm text-tape-light-brown">
          Google認証でログイン済みのアカウントにパスワードを設定します
        </p>
      </div>

      <section className="rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-tape-brown">
              新しいパスワード
            </label>
            <Input
              id="password"
              type="password"
              placeholder="6文字以上"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              minLength={6}
            />
            <p className="text-xs text-tape-light-brown">
              次回からこのパスワードでログインできます
            </p>
          </div>

          {message && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border-tape-green/30 bg-tape-green/10 text-tape-brown"
                  : "border-tape-pink/30 bg-tape-pink/10 text-tape-pink"
              }`}
            >
              {message.text}
            </div>
          )}

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? "設定中..." : "パスワードを設定"}
          </Button>
        </form>
      </section>

      <div className="text-center">
        <Link href="/" className="text-sm text-tape-brown underline-offset-4 hover:underline">
          ホームに戻る
        </Link>
      </div>
    </main>
  );
}
