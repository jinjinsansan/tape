import Link from "next/link";

import { ReferralCookieSetter } from "./cookie-setter";

export default function InviteLanding({ params }: { params: { code: string } }) {
  const normalizedCode = decodeURIComponent(params.code).trim();

  return (
    <main className="min-h-screen bg-tape-cream px-4 py-16">
      <div className="mx-auto max-w-2xl rounded-3xl border border-tape-beige bg-white/90 p-8 text-center shadow-sm">
        <ReferralCookieSetter code={normalizedCode} />
        <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">INVITATION</p>
        <h1 className="mt-2 text-3xl font-bold text-tape-brown">Tape への招待状</h1>
        <p className="mt-4 text-sm text-tape-brown/80">
          友達からの紹介コード <span className="font-mono text-base text-tape-pink">{normalizedCode}</span> を記録しました。<br />
          会員登録後にマイページへアクセスすると、招待特典が自動的に適用されます。
        </p>
        <div className="mt-8 flex flex-col gap-3 text-sm text-tape-brown">
          <p>1. 下のボタンからログイン/新規登録します。</p>
          <p>2. かんじょうにっきを5日 & 10日書くと、紹介者にポイントが付与されます。</p>
          <p>3. 自分もマイページでポイントや特典を確認できます。</p>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-full bg-tape-pink px-6 py-3 text-sm font-bold text-white shadow hover:bg-tape-pink/90"
          >
            ログイン / 新規登録
          </Link>
          <Link
            href="/"
            className="rounded-full border border-tape-beige px-6 py-3 text-sm font-semibold text-tape-brown hover:bg-tape-cream"
          >
            トップへ戻る
          </Link>
        </div>
        <p className="mt-6 text-xs text-tape-light-brown">
          招待コードは30日間ブラウザに保存されます。登録後にマイページからも入力できます。
        </p>
      </div>
    </main>
  );
}
