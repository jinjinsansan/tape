"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Settings as SettingsIcon, Activity, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type HealthStatus = {
  supabase: boolean;
  openai: boolean;
  database: boolean;
};

type SalesSettings = {
  psychologyEnabled: boolean;
  attractionEnabled: boolean;
};

const DEFAULT_SALES_SETTINGS: SalesSettings = {
  psychologyEnabled: false,
  attractionEnabled: false
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
  const [salesSettings, setSalesSettings] = useState<SalesSettings>(DEFAULT_SALES_SETTINGS);
  const [salesSaving, setSalesSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [aiData, healthData, salesData] = await Promise.all([
        fetchJson<{ delayMinutes: number }>("/api/admin/diary/ai-settings"),
        fetchJson<{ health: HealthStatus }>("/api/admin/health"),
        fetchJson<{ settings: SalesSettings }>("/api/admin/michelle/sales-settings")
      ]);
      setAiDelayMinutes(aiData.delayMinutes);
      setHealth(healthData.health);
      setSalesSettings(salesData.settings ?? DEFAULT_SALES_SETTINGS);
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

  const handleSalesToggle = async (key: keyof SalesSettings, value: boolean) => {
    setSalesSaving(true);
    try {
      const nextSettings = { ...salesSettings, [key]: value };
      const data = await fetchJson<{ settings: SalesSettings }>("/api/admin/michelle/sales-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings)
      });
      setSalesSettings(data.settings ?? nextSettings);
      alert("営業設定を更新しました");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "営業設定の更新に失敗しました");
    } finally {
      setSalesSaving(false);
    }
  };

  const renderSalesToggle = (key: keyof SalesSettings, title: string, description: string) => {
    const value = salesSettings[key];
    return (
      <div key={key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
        <div className="pr-4">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => handleSalesToggle(key, !value)}
          disabled={salesSaving}
          aria-pressed={value}
          className={`relative inline-flex h-9 w-16 items-center rounded-full border transition-colors ${
            value ? "border-green-300 bg-green-100 text-green-800" : "border-slate-200 bg-white text-slate-500"
          } ${salesSaving ? "cursor-not-allowed opacity-70" : "hover:bg-slate-50"}`}
        >
          <span
            className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition ${
              value ? "translate-x-7" : "translate-x-1"
            }`}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
            {value ? "ON" : "OFF"}
          </span>
        </button>
      </div>
    );
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

            {/* Sales Settings */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-bold text-slate-900">動画コース営業設定</h3>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                ミシェル心理学チャット / ミシェル引き寄せチャットの返信に、50往復に1回だけ動画コースのご案内を差し込むかどうかを切り替えます。
              </p>
              <div className="mt-4 space-y-3">
                {renderSalesToggle(
                  "psychologyEnabled",
                  "ミシェル心理学チャット",
                  "テープ式心理カウンセラー育成講座の案内を追加する"
                )}
                {renderSalesToggle(
                  "attractionEnabled",
                  "ミシェル引き寄せチャット",
                  "引き寄せ講座Permitの案内を追加する"
                )}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                ※ 各チャットで10往復未満の会話には案内は表示されません。
              </p>
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
