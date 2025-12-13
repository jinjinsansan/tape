export default function FeedManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-blue-500">FEED MANAGEMENT</p>
          <h1 className="text-4xl font-black text-slate-900">みんなの日記管理</h1>
          <p className="text-sm text-slate-500">
            公開日記の管理・モデレーション
          </p>
        </header>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-amber-900">
            🚧 準備中
          </p>
          <p className="mt-2 text-sm text-amber-700">
            みんなの日記管理機能は現在開発中です。近日中に公開予定です。
          </p>
          <p className="mt-4 text-xs text-amber-600">
            お急ぎの場合は、通報管理ページから対応してください。
          </p>
        </div>
      </div>
    </div>
  );
}
