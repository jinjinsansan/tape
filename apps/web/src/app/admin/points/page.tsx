export default function PointsManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-emerald-500">POINTS MANAGEMENT</p>
          <h1 className="text-4xl font-black text-slate-900">ポイント管理</h1>
          <p className="text-sm text-slate-500">
            ポイント獲得ルール・景品カタログ・交換履歴を管理
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-700">
            ポイント管理機能は既存の管理者パネルに実装済みです
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Phase 2で独立したページに移行予定
          </p>
          <a
            href="/admin/_old_page.tsx.backup"
            className="mt-4 inline-block rounded-full bg-emerald-500 px-6 py-2 text-sm text-white hover:bg-emerald-600"
          >
            従来のページで管理
          </a>
        </div>
      </div>
    </div>
  );
}
