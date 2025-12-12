"use client";

import { useState, useEffect, useCallback } from "react";
import { Share2, TrendingUp, Users as UsersIcon, ExternalLink } from "lucide-react";

type ShareStats = {
  totalShares: number;
  xShares: number;
  usersWithTwitter: number;
  recentShares: Array<{
    id: string;
    userName: string;
    twitterUsername: string;
    platform: string;
    sharedAt: string;
  }>;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res.json();
}

export default function ShareMonitoringPage() {
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<ShareStats>("/api/admin/share-stats");
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-blue-500">SHARE MONITORING</p>
          <h1 className="text-4xl font-black text-slate-900">Xシェア監視</h1>
          <p className="text-sm text-slate-500">
            SNSシェアの統計・ログ確認・不正防止
          </p>
        </header>

        <button
          onClick={loadStats}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          再読み込み
        </button>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-slate-500">読み込み中...</p>
          </div>
        ) : !stats ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-slate-500">データの取得に失敗しました</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-600">総シェア回数</p>
                    <p className="mt-2 text-3xl font-black text-blue-900">
                      {stats.totalShares.toLocaleString()}
                    </p>
                  </div>
                  <Share2 className="h-10 w-10 text-blue-400" />
                </div>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-sky-600">Xシェア回数</p>
                    <p className="mt-2 text-3xl font-black text-sky-900">
                      {stats.xShares.toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-sky-400" />
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-indigo-600">X登録ユーザー</p>
                    <p className="mt-2 text-3xl font-black text-indigo-900">
                      {stats.usersWithTwitter.toLocaleString()}
                    </p>
                  </div>
                  <UsersIcon className="h-10 w-10 text-indigo-400" />
                </div>
              </div>
            </div>

            {/* Recent Shares Log */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                最近のシェアログ（直近20件）
              </h2>

              {stats.recentShares.length === 0 ? (
                <p className="mt-4 text-center text-sm text-slate-500">
                  まだシェアログがありません
                </p>
              ) : (
                <div className="mt-4 space-y-2 max-h-[600px] overflow-y-auto">
                  {stats.recentShares.map((share) => (
                    <div
                      key={share.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {share.userName}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-slate-600">
                            {share.platform === "x"
                              ? "🐦 X"
                              : share.platform === "line"
                              ? "💬 LINE"
                              : "📋 Copy"}
                          </span>
                          {share.twitterUsername !== "-" && (
                            <a
                              href={`https://x.com/search?q=%23かんじょうにっき%20OR%20%23テープ式心理学%20from%3A${share.twitterUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-500 hover:underline"
                            >
                              @{share.twitterUsername}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 whitespace-nowrap">
                        {new Date(share.sharedAt).toLocaleString("ja-JP", {
                          hour12: false
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-sm text-blue-900">
                💡 <strong>Xシェア不正防止システム</strong>
              </p>
              <ul className="mt-2 space-y-1 text-xs text-blue-700">
                <li>• ユーザーはマイページでXアカウント登録が必要（7日間変更不可）</li>
                <li>• シェア時に #かんじょうにっき #テープ式心理学 が自動挿入</li>
                <li>• 「投稿確認」リンクで実際のX投稿を検索・確認可能</li>
                <li>• すべてのシェアはログ記録され、ここで監視できます</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
