import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Button } from "@/components/ui/button";

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const errorMessage = searchParams?.error;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col gap-6 px-4 py-10">
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">TAPE AUTH</p>
        <h1 className="text-3xl font-bold text-tape-brown">ログイン</h1>
        <p className="text-sm text-tape-light-brown">Googleアカウントでログインして、Tape式心理学の各サービスをご利用ください。</p>
      </div>

      {errorMessage && (
        <p className="rounded-2xl border border-tape-pink/40 bg-tape-pink/10 px-4 py-3 text-xs text-tape-pink">
          {decodeURIComponent(errorMessage)}
        </p>
      )}

      <section className="rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
        <GoogleSignInButton />
      </section>

      <div className="text-center text-xs text-tape-light-brown">
        <p>※ ログインで問題が発生する場合は、少し時間を置いて再度お試しください。</p>
        <p className="mt-2">
          <Link href="/" className="text-tape-brown underline-offset-4 hover:underline">
            ホームに戻る
          </Link>
        </p>
      </div>

      <div className="flex justify-center">
        <Link href="/">
          <Button variant="ghost" size="sm">
            ← ホームへ
          </Button>
        </Link>
      </div>
    </main>
  );
}
