"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, RefreshCw, Eye, EyeOff, Users } from "lucide-react";

type DiaryReport = {
  id: string;
  reason: string;
  created_at: string;
  reporter: { display_name: string } | null;
  entry: {
    id: string;
    content: string;
    visibility: string;
  } | null;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export function ReportsManagementClient() {
  const [reports, setReports] = useState<DiaryReport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{ reports: DiaryReport[] }>("/api/admin/diary/reports");
      setReports(data.reports ?? []);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "通報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const resolveReport = async (reportId: string) => {
    const note = prompt("対応メモ (任意)") ?? undefined;
    try {
      await fetchJson(`/api/admin/diary/reports/${reportId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note })
      });
      loadReports();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "通報の解決に失敗しました");
    }
  };

  const updateVisibility = async (entryId: string, visibility: "public" | "followers" | "private") => {
    try {
      await fetchJson(`/api/admin/diary/entries/${entryId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility })
      });
      loadReports();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "公開設定の更新に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-rose-500">REPORTS MANAGEMENT</p>
          <h1 className="text-4xl font-black text-slate-900">通報管理</h1>
          <p className="text-sm text-slate-500">
            みんなの日記の通報キューを確認・対応
          </p>
        </header>

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            <span className="font-semibold">{reports.length}件の未処理通報</span>
          </div>
          <button
            onClick={loadReports}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            再読み込み
          </button>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-slate-500">読み込み中...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <AlertTriangle className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-semibold text-slate-700">未処理の通報はありません</p>
            <p className="mt-2 text-sm text-slate-500">
              新しい通報が入ると、ここに表示されます
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <article
                key={report.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                {/* Report Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-rose-100 p-2">
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        通報者: {report.reporter?.display_name ?? "不明"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(report.created_at).toLocaleString("ja-JP", { hour12: false })}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                    未処理
                  </span>
                </div>

                {/* Report Reason */}
                <div className="mt-4 rounded-xl bg-rose-50/50 p-3">
                  <p className="text-xs font-semibold text-rose-700">通報理由</p>
                  <p className="mt-1 text-sm text-rose-900">{report.reason}</p>
                </div>

                {/* Diary Content */}
                {report.entry ? (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-600">日記内容</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {report.entry.content}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <span className={`rounded-full px-2 py-0.5 ${
                        report.entry.visibility === "public"
                          ? "bg-green-100 text-green-700"
                          : report.entry.visibility === "followers"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {report.entry.visibility === "public" ? "公開" : 
                         report.entry.visibility === "followers" ? "カウンセラー共有" : "非公開"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl bg-slate-100 p-4 text-center">
                    <p className="text-sm text-slate-500">この日記は既に削除されています</p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => resolveReport(report.id)}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    ✓ 解決済みにする
                  </button>
                  {report.entry && (
                    <>
                      <button
                        onClick={() => updateVisibility(report.entry!.id, "followers")}
                        className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
                      >
                        <Users className="h-4 w-4" />
                        カウンセラー共有に変更
                      </button>
                      <button
                        onClick={() => updateVisibility(report.entry!.id, "private")}
                        className="flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600"
                      >
                        <EyeOff className="h-4 w-4" />
                        非公開にする
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
