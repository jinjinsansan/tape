"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Settings as SettingsIcon, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

type HealthStatus = {
  supabase: boolean;
  openai: boolean;
  database: boolean;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res.json();
}

export function SettingsManagementClient() {
  const [aiDelayMinutes, setAiDelayMinutes] = useState(1);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [aiData, healthData] = await Promise.all([
        fetchJson<{ delayMinutes: number }>("/api/admin/diary/ai-settings"),
        fetchJson<{ health: HealthStatus }>("/api/admin/health")
      ]);
      setAiDelayMinutes(aiData.delayMinutes);
      setHealth(healthData.health);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveAiSettings = async () => {
    setSaving(true);
    try {
      await fetchJson("/api/admin/diary/ai-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delayMinutes: aiDelayMinutes })
      });
      alert("設定を更新しました");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500">SETTINGS</p>
          <h1 className="text-4xl font-black text-slate-900">設定</h1>
          <p className="text-sm text-slate-500">
            AI設定・システムヘルスチェック
          </p>
        </header>

        {/* Action Bar */}
        <div className="flex items-center justify-end">
          <button
            onClick={loadSettings}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            再読み込み
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-slate-500">読み込み中...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* AI Settings */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-bold text-slate-900">Michelle AI設定</h3>
              </div>
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <label className="block text-sm font-semibold text-slate-700">
                  日記AIコメントの遅延時間
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  ユーザーが日記を投稿してから、Michelleが自動コメントを投稿するまでの待機時間を設定します。
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <select
                    value={aiDelayMinutes}
                    onChange={(e) => setAiDelayMinutes(Number(e.target.value))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value={1}>1分</option>
                    <option value={5}>5分</option>
                    <option value={10}>10分</option>
                    <option value={30}>30分</option>
                    <option value={60}>1時間</option>
                    <option value={1440}>24時間</option>
                  </select>
                  <Button
                    onClick={handleSaveAiSettings}
                    disabled={saving}
                    className="bg-slate-700 text-white hover:bg-slate-800"
                  >
                    {saving ? "更新中..." : "設定を保存"}
                  </Button>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-bold text-slate-900">システムヘルス</h3>
              </div>
              {health && (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div
                    className={`rounded-xl p-4 ${
                      health.supabase ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-600">Supabase</p>
                    <p
                      className={`mt-1 text-2xl font-bold ${
                        health.supabase ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {health.supabase ? "正常" : "エラー"}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-4 ${
                      health.openai ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-600">OpenAI</p>
                    <p
                      className={`mt-1 text-2xl font-bold ${
                        health.openai ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {health.openai ? "正常" : "エラー"}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-4 ${
                      health.database ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-600">Database</p>
                    <p
                      className={`mt-1 text-2xl font-bold ${
                        health.database ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {health.database ? "正常" : "エラー"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
