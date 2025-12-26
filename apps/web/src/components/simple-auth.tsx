"use client";

import { useState, useEffect, FormEvent } from "react";
import { createSupabaseBrowserClient } from "@tape/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

type Mode = "signin" | "signup";
const LAST_EMAIL_KEY = "tape:last-auth-email";

export function SimpleAuth() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedEmail = window.localStorage.getItem(LAST_EMAIL_KEY);
    if (storedEmail) {
      setEmail(storedEmail);
      setRememberEmail(true);
    }
  }, []);

  const persistEmailPreference = (value: string) => {
    if (typeof window === "undefined") return;
    if (rememberEmail && value) {
      window.localStorage.setItem(LAST_EMAIL_KEY, value);
    } else {
      window.localStorage.removeItem(LAST_EMAIL_KEY);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        fetch("/api/profile/onboarding-email/send-now", {
          method: "POST",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
        }).catch(() => {
          /* best-effort */
        });
        
        setSuccess("登録完了！そのままログインしてください");
        setMode("signin");
        persistEmailPreference(email);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        persistEmailPreference(email);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setSuccess("パスワードリセットメールを送信しました。メールボックスを確認してください。");
      setShowPasswordReset(false);
    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (showPasswordReset) {
    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <h2 className="text-xl font-bold text-center">パスワードリセット</h2>
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="メールアドレス"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-600">
              {success}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "送信中..." : "リセットメールを送信"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setShowPasswordReset(false);
              setError(null);
              setSuccess(null);
            }}
            className="w-full text-sm text-gray-600 hover:text-gray-900"
          >
            ログインに戻る
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError(null);
            setSuccess(null);
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
            mode === "signin" ? "bg-white shadow-sm" : ""
          }`}
        >
          ログイン
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setSuccess(null);
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
            mode === "signup" ? "bg-white shadow-sm" : ""
          }`}
        >
          新規登録
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <Input
            type="password"
            placeholder="パスワード (6文字以上)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            disabled={loading}
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            className="h-4 w-4 accent-tape-orange"
            checked={rememberEmail}
            onChange={(event) => {
              const checked = event.target.checked;
              setRememberEmail(checked);
              if (!checked && typeof window !== "undefined") {
                window.localStorage.removeItem(LAST_EMAIL_KEY);
              } else if (checked) {
                persistEmailPreference(email);
              }
            }}
          />
          メールアドレスを記憶する
        </label>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-600">
            {success}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "処理中..." : mode === "signup" ? "登録" : "ログイン"}
        </Button>

        {mode === "signin" && (
          <button
            type="button"
            onClick={() => setShowPasswordReset(true)}
            className="w-full text-sm text-gray-600 hover:text-gray-900"
          >
            パスワードを忘れた場合
          </button>
        )}
      </form>
    </div>
  );
}
