export default function DiaryManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-purple-500">DIARY MANAGEMENT</p>
          <h1 className="text-4xl font-black text-slate-900">日記管理</h1>
          <p className="text-sm text-slate-500">
            ユーザー日記の確認・管理
          </p>
        </header>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-amber-900">
            🚧 準備中
          </p>
          <p className="mt-2 text-sm text-amber-700">
            日記管理機能は現在開発中です。近日中に公開予定です。
          </p>
          <p className="mt-4 text-xs text-amber-600">
            お急ぎの場合は、データベースから直接確認してください。
          </p>
        </div>
      </div>
    </div>
  );
}
