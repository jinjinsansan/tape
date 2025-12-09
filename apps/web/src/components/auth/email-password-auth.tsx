"use client";

import { useState, FormEvent } from "react";
import { createSupabaseBrowserClient } from "@tape/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

type AuthMode = "signin" | "signup";

export function EmailPasswordAuth() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      setMessage({ type: "error", text: "有効なメールアドレスを入力してください" });
      return;
    }

    if (!password || password.length < 6) {
      setMessage({ type: "error", text: "パスワードは6文字以上で入力してください" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "signup") {
        // サインアップ
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          throw error;
        }

        setMessage({
          type: "success",
          text: "登録メールを送信しました。メールボックスを確認して、確認リンクをクリックしてください。"
        });
        setEmail("");
        setPassword("");
      } else {
        // サインイン
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        setMessage({ type: "success", text: "ログイン成功！" });
        
        // ログイン成功後、ページをリロードして認証状態を反映
        setTimeout(() => {
          router.refresh();
        }, 500);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      
      let errorMessage = "エラーが発生しました";
      
      if (err.message?.includes("Invalid login credentials")) {
        errorMessage = "メールアドレスまたはパスワードが正しくありません";
      } else if (err.message?.includes("Email not confirmed")) {
        errorMessage = "メールアドレスが確認されていません。メールボックスを確認してください";
      } else if (err.message?.includes("User already registered")) {
        errorMessage = "このメールアドレスは既に登録されています";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* モード切り替えタブ */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setMessage(null);
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === "signin"
              ? "bg-white text-tape-brown shadow-sm"
              : "text-gray-600 hover:text-tape-brown"
          }`}
        >
          ログイン
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setMessage(null);
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-white text-tape-brown shadow-sm"
              : "text-gray-600 hover:text-tape-brown"
          }`}
        >
          新規登録
        </button>
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-tape-brown">
            メールアドレス
          </label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-tape-brown">
            パスワード
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
          {loading
            ? "処理中..."
            : mode === "signup"
            ? "新規登録"
            : "ログイン"}
        </Button>

        {mode === "signin" && (
          <p className="text-center text-xs text-tape-light-brown">
            パスワードを忘れた場合は、新規登録からやり直してください
          </p>
        )}

        {mode === "signup" && (
          <p className="text-center text-xs text-tape-light-brown">
            登録後、確認メールが届きます。メール内のリンクをクリックして登録を完了してください。
          </p>
        )}
      </form>
    </div>
  );
}
