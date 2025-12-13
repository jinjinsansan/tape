import { FeedManagementClient } from "./feed-management-client";

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

        <FeedManagementClient />
      </div>
    </div>
  );
}
