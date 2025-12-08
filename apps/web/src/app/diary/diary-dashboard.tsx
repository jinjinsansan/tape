"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { DiaryVisibility } from "@tape/supabase";

type DiaryScope = "me" | "public";

type DiaryFeeling = {
  label: string;
  intensity: number;
  tone?: string | null;
};

type DiaryEntry = {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  mood_score: number | null;
  mood_label: string | null;
  mood_color: string | null;
  energy_level: number | null;
  visibility: DiaryVisibility;
  published_at: string | null;
  journal_date: string;
  created_at: string;
  feelings: DiaryFeeling[];
};

const today = () => new Date().toISOString().slice(0, 10);

const defaultForm = {
  title: "",
  content: "",
  moodScore: 3,
  energyLevel: 3,
  visibility: "private" as DiaryVisibility,
  journalDate: today()
};

type FeelingDraft = DiaryFeeling;

export function DiaryDashboard() {
  const [scope, setScope] = useState<DiaryScope>("me");
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [feelings, setFeelings] = useState<FeelingDraft[]>([]);
  const [newFeeling, setNewFeeling] = useState<FeelingDraft>({ label: "", intensity: 50 });

  const fetchEntries = useCallback(
    async (targetScope: DiaryScope) => {
      setLoading(true);
      setError(null);
      setNeedsAuth(false);
      try {
        const res = await fetch(`/api/diary/entries?scope=${targetScope}`, {
          cache: "no-store"
        });

        if (res.status === 401 && targetScope === "me") {
          setNeedsAuth(true);
          setEntries([]);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to load entries");
        }

        const data = (await res.json()) as { entries: DiaryEntry[] };
        setEntries(data.entries ?? []);
      } catch (err) {
        console.error(err);
        setError("にっきの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchEntries(scope);
  }, [scope, fetchEntries]);

  const addFeeling = () => {
    if (!newFeeling.label.trim()) return;
    if (feelings.find((feeling) => feeling.label === newFeeling.label.trim())) {
      return;
    }
    setFeelings((prev) => [...prev, { ...newFeeling, label: newFeeling.label.trim() }].slice(0, 6));
    setNewFeeling({ label: "", intensity: 50 });
  };

  const removeFeeling = (label: string) => {
    setFeelings((prev) => prev.filter((feeling) => feeling.label !== label));
  };

  const handleCreate = async () => {
    if (!form.content.trim()) {
      setSaveError("本文を入力してください");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/diary/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: form.title || null,
          content: form.content,
          moodScore: form.moodScore,
          energyLevel: form.energyLevel,
          visibility: form.visibility,
          journalDate: form.journalDate,
          feelings
        })
      });

      if (res.status === 401) {
        setNeedsAuth(true);
        setSaveError("ログインが必要です");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to create entry");
      }

      const data = (await res.json()) as { entry: DiaryEntry };
      if (scope === "me") {
        setEntries((prev) => [data.entry, ...prev]);
      }
      setForm({ ...defaultForm, journalDate: today(), visibility: form.visibility });
      setFeelings([]);
    } catch (err) {
      console.error(err);
      setSaveError("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("この日記を削除しますか？")) return;
    try {
      const res = await fetch(`/api/diary/entries/${entryId}`, {
        method: "DELETE"
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete entry");
      }
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    }
  };

  const handleVisibilityChange = async (entryId: string, visibility: DiaryVisibility) => {
    try {
      const res = await fetch(`/api/diary/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ visibility })
      });
      if (!res.ok) {
        throw new Error("Failed to update visibility");
      }
      const data = (await res.json()) as { entry: DiaryEntry };
      setEntries((prev) => prev.map((entry) => (entry.id === entryId ? data.entry : entry)));
    } catch (err) {
      console.error(err);
      alert("公開設定の更新に失敗しました");
    }
  };

  const moodTrend = useMemo(() => {
    return entries
      .filter((entry) => entry.mood_score)
      .map((entry) => ({
        date: entry.journal_date,
        score: entry.mood_score ?? 0
      }))
      .slice(0, 10)
      .reverse();
  }, [entries]);

  return (
    <div className="space-y-10">
      <section className="grid gap-6 rounded-3xl border border-slate-100 bg-white/70 p-6 shadow-xl shadow-slate-200/50 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-rose-500">今日の記録</p>
          <div className="mt-4 space-y-4">
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="タイトル (任意)"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-200 focus:outline-none"
            />
            <textarea
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="出来事・感情・身体感覚を自由にメモ"
              className="h-32 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-200 focus:outline-none"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col text-xs font-semibold text-slate-500">
                気分 (1-5)
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={form.moodScore}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, moodScore: Number(event.target.value) }))
                  }
                  className="mt-2"
                />
                <span className="mt-1 text-sm text-slate-700">{form.moodScore}</span>
              </label>
              <label className="flex flex-col text-xs font-semibold text-slate-500">
                体力/エネルギー
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={form.energyLevel}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, energyLevel: Number(event.target.value) }))
                  }
                  className="mt-2"
                />
                <span className="mt-1 text-sm text-slate-700">{form.energyLevel}</span>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-500">
                記録日
                <input
                  type="date"
                  value={form.journalDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, journalDate: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-200 focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                公開設定
                <select
                  value={form.visibility}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, visibility: event.target.value as DiaryVisibility }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-rose-200 focus:outline-none"
                >
                  <option value="private">非公開</option>
                  <option value="followers">ゆる公開</option>
                  <option value="public">全体公開</option>
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500">感情タグ (最大6個)</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {feelings.map((feeling) => (
                  <button
                    key={feeling.label}
                    type="button"
                    onClick={() => removeFeeling(feeling.label)}
                    className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                  >
                    {feeling.label}
                    <span className="ml-2 text-[10px] text-rose-400">{feeling.intensity}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[2fr,1fr,auto]">
                <input
                  value={newFeeling.label}
                  onChange={(event) => setNewFeeling((prev) => ({ ...prev, label: event.target.value }))}
                  placeholder="例: 不安 / 期待"
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-200 focus:outline-none"
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={newFeeling.intensity}
                  onChange={(event) => setNewFeeling((prev) => ({ ...prev, intensity: Number(event.target.value) }))}
                />
                <button
                  type="button"
                  onClick={addFeeling}
                  className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-600"
                >
                  追加
                </button>
              </div>
            </div>

            {saveError && <p className="text-xs text-rose-500">{saveError}</p>}

            <button
              type="button"
              onClick={handleCreate}
              disabled={isSaving}
              className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-400/30 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? "保存中..." : "かんじょうを記録"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50/80 p-5 shadow-inner">
          <p className="text-xs font-semibold text-slate-500">最近のムードトレンド</p>
          {moodTrend.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">まだ十分なデータがありません。</p>
          ) : (
            <div className="mt-6 space-y-4">
              {moodTrend.map((item) => (
                <div key={item.date} className="flex items-center gap-4 text-sm">
                  <span className="w-20 text-xs text-slate-500">{item.date}</span>
                  <div className="flex-1 rounded-full bg-white">
                    <div
                      className="h-3 rounded-full bg-rose-400"
                      style={{ width: `${(item.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-semibold text-slate-700">{item.score}</span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-8 text-xs font-semibold text-slate-500">公開設定メモ</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-500">
            <li>「全体公開」でSNSフィードに流れます</li>
            <li>後から非公開に戻すこともできます</li>
            <li>AIコメントは今後この画面に表示予定です</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-500">
            {["me", "public"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setScope(tab as DiaryScope)}
                className={`rounded-full px-4 py-2 transition ${
                  scope === tab ? "bg-white shadow text-slate-900" : "text-slate-500"
                }`}
              >
                {tab === "me" ? "マイ日記" : "公開フィード"}
              </button>
            ))}
          </div>
          {needsAuth && scope === "me" && (
            <p className="text-xs text-rose-500">ログインすると自分の日記が確認できます。</p>
          )}
        </div>

        {loading ? (
          <p className="rounded-2xl border border-slate-100 bg-white/70 px-4 py-6 text-sm text-slate-500">
            読み込み中...
          </p>
        ) : error ? (
          <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-6 text-sm text-rose-600">
            {error}
          </p>
        ) : entries.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-white/70 px-4 py-6 text-sm text-slate-500">
            まだ日記がありません。
          </p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-md shadow-slate-200/50"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{entry.journal_date}</span>
                  <span>ムード: {entry.mood_score ?? "-"}</span>
                  <span>エネルギー: {entry.energy_level ?? "-"}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      entry.visibility === "public"
                        ? "bg-green-100 text-green-600"
                        : entry.visibility === "followers"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {entry.visibility === "public"
                      ? "全体公開"
                      : entry.visibility === "followers"
                      ? "ゆる公開"
                      : "非公開"}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{entry.title ?? "(タイトルなし)"}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{entry.content}</p>

                {entry.feelings?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.feelings.map((feeling) => (
                      <span
                        key={`${entry.id}-${feeling.label}`}
                        className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                      >
                        {feeling.label}
                        <span className="ml-1 text-[10px] text-rose-400">{feeling.intensity}</span>
                      </span>
                    ))}
                  </div>
                )}

                {scope === "me" && (
                  <div className="mt-4 flex flex-wrap gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => handleVisibilityChange(entry.id, "public")}
                      className="rounded-full border border-slate-200 px-3 py-1 text-slate-500 hover:border-rose-200 hover:text-rose-600"
                    >
                      公開する
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVisibilityChange(entry.id, "private")}
                      className="rounded-full border border-slate-200 px-3 py-1 text-slate-500 hover:border-rose-200 hover:text-rose-600"
                    >
                      非公開に戻す
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 hover:bg-rose-50"
                    >
                      削除
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
