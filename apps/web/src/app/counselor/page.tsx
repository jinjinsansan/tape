import Link from "next/link";

import { CounselorsListClient } from "./counselors-list-client";

export default function CounselorsPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold tracking-[0.4em] text-rose-500">TAPE COUNSELOR</p>
        <h1 className="text-3xl font-black text-slate-900">Tape認定カウンセラー</h1>
        <p className="text-sm text-slate-500">感情整理〜セルフケアまで伴走するプロフェッショナルをご紹介します。</p>
      </header>

      <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
        <CounselorsListClient />
      </section>
    </main>
  );
}
