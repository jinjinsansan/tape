import { DiaryManagementClient } from "./diary-management-client";

export default function DiaryManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-purple-500">DIARY MANAGEMENT</p>
          <h1 className="text-4xl font-black text-slate-900">日記管理</h1>
          <p className="text-sm text-slate-500">
            全ユーザーの日記を確認・管理
          </p>
        </header>

        <DiaryManagementClient />
      </div>
    </div>
  );
}
