import { DiaryDashboard } from "./diary-dashboard";

export default function DiaryPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="mb-8 space-y-2 text-center">
        <p className="text-xs font-semibold tracking-[0.4em] text-rose-400">TAPE EMOTION JOURNAL</p>
        <h1 className="text-3xl font-black text-slate-900">かんじょうにっき</h1>
        <p className="text-sm text-slate-500">
          感情・出来事・身体感覚をセットで記録し、気分の波や公開日記を整理できます。
        </p>
      </header>

      <DiaryDashboard />
    </main>
  );
}
