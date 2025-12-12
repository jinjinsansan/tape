export default function CounselorsManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-purple-500">COUNSELORS</p>
          <h1 className="text-4xl font-black text-slate-900">カウンセラー管理</h1>
          <p className="text-sm text-slate-500">
            カウンセラーのプロフィール情報確認（既存の管理者パネルで実装済み）
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-700">
            カウンセラー管理機能は従来の管理者パネルに実装済みです
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Phase 3で独立したページに移行予定
          </p>
          <p className="mt-4 text-xs text-slate-400">
            💡 新規カウンセラーの追加は「ユーザー管理」から行えます
          </p>
        </div>
      </div>
    </div>
  );
}
