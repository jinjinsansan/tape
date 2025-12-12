"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, UserCheck, Mail, Calendar } from "lucide-react";

type Counselor = {
  id: string;
  display_name: string | null;
  bio: string | null;
  expertise: string[];
  hourly_rate: number | null;
  available_slots: string[];
  created_at: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res.json();
}

export function CounselorsManagementClient() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCounselors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{ counselors: Counselor[] }>("/api/admin/counselors");
      setCounselors(data.counselors ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounselors();
  }, [loadCounselors]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-purple-500">COUNSELORS</p>
          <h1 className="text-4xl font-black text-slate-900">カウンセラー管理</h1>
          <p className="text-sm text-slate-500">
            カウンセラーのプロフィール情報確認
          </p>
        </header>

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            登録カウンセラー: <span className="font-bold">{counselors.length}</span>人
          </div>
          <button
            onClick={loadCounselors}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            再読み込み
          </button>
        </div>

        {/* Info Box */}
        <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
          <p className="text-sm text-purple-900">
            💡 <strong>新規カウンセラーの追加</strong>
          </p>
          <p className="mt-1 text-xs text-purple-700">
            「ユーザー管理」ページで対象ユーザーを「カウンセラー化」してください。
            プロフィール編集は各カウンセラーが自分のダッシュボード（/dashboard/counselor）から行います。
          </p>
        </div>

        {/* Counselors List */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-slate-500">読み込み中...</p>
          </div>
        ) : counselors.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <UserCheck className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-semibold text-slate-700">カウンセラーが登録されていません</p>
            <p className="mt-2 text-sm text-slate-500">
              ユーザー管理ページから新規カウンセラーを追加してください
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {counselors.map((counselor) => (
              <div
                key={counselor.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-purple-100 p-3">
                      <UserCheck className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {counselor.display_name ?? "名前未設定"}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        登録: {new Date(counselor.created_at).toLocaleDateString("ja-JP")}
                      </div>
                    </div>
                  </div>
                </div>

                {counselor.bio && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-600">プロフィール</p>
                    <p className="mt-1 text-sm text-slate-700">{counselor.bio}</p>
                  </div>
                )}

                {counselor.expertise.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-600">専門分野</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {counselor.expertise.map((exp, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {counselor.hourly_rate && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="text-slate-600">料金:</span>
                    <span className="font-bold text-slate-900">
                      ¥{counselor.hourly_rate.toLocaleString()} / 時間
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
