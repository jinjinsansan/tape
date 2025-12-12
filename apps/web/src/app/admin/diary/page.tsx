export default function DiaryManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-purple-500">DIARY MANAGEMENT</p>
          <h1 className="text-4xl font-black text-slate-900">日記管理</h1>
          <p className="text-sm text-slate-500">
            ユーザー日記へのコメント・管理（既存の管理者パネルで実装済み）
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-700">
            日記管理機能は従来の管理者パネルに実装済みです
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Phase 3で独立したページに移行予定
          </p>
        </div>
      </div>
    </div>
  );
}
