export default function CoursesManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-500">COURSES</p>
          <h1 className="text-4xl font-black text-slate-900">コース管理</h1>
          <p className="text-sm text-slate-500">
            学習コンテンツ・モジュール・レッスンの管理（既存のページで実装済み）
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-700">
            コース管理は専用ページで実装済みです
          </p>
          <p className="mt-2 text-sm text-slate-500">
            /admin/course-management からアクセスできます
          </p>
          <a
            href="/admin/course-management"
            className="mt-4 inline-block rounded-full bg-indigo-500 px-6 py-2 text-sm text-white hover:bg-indigo-600"
          >
            コース管理ページへ
          </a>
        </div>
      </div>
    </div>
  );
}
