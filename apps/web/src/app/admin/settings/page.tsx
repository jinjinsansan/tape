export default function SettingsManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500">SETTINGS</p>
          <h1 className="text-4xl font-black text-slate-900">設定</h1>
          <p className="text-sm text-slate-500">
            AI設定・システム設定（既存の管理者パネルで実装済み）
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-700">
            設定機能は従来の管理者パネルに実装済みです
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Phase 3で独立したページに移行予定
          </p>
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left">
            <p className="text-xs font-semibold text-slate-600">現在の設定項目：</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              <li>• Michelleの日記AIコメント遅延時間</li>
              <li>• システムヘルスチェック</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
