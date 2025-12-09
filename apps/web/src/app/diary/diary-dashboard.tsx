"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  emotion_label: string | null;
  event_summary: string | null;
  realization: string | null;
  self_esteem_score: number | null;
  worthlessness_score: number | null;
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
  visibility: "private" as DiaryVisibility,
  journalDate: today()
};

type FeelingDraft = DiaryFeeling;

type InitialScore = {
  self_esteem_score: number;
  worthlessness_score: number;
  measured_on: string;
};

const emotionOptions = [
  { label: "恐怖", tone: "bg-purple-100 text-purple-800 border-purple-200" },
  { label: "悲しみ", tone: "bg-blue-100 text-blue-800 border-blue-200" },
  { label: "怒り", tone: "bg-red-100 text-red-800 border-red-200" },
  { label: "悔しい", tone: "bg-green-100 text-green-800 border-green-200" },
  { label: "無価値感", tone: "bg-gray-100 text-gray-800 border-gray-300" },
  { label: "罪悪感", tone: "bg-orange-100 text-orange-800 border-orange-200" },
  { label: "寂しさ", tone: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { label: "恥ずかしさ", tone: "bg-pink-100 text-pink-800 border-pink-200" },
  { label: "嬉しい", tone: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { label: "感謝", tone: "bg-teal-100 text-teal-800 border-teal-200" },
  { label: "達成感", tone: "bg-lime-100 text-lime-800 border-lime-200" },
  { label: "幸せ", tone: "bg-amber-100 text-amber-800 border-amber-200" }
];

const GUEST_STORAGE_KEY = "tape_diary_guest_entries";

const generateGuestId = () => {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readGuestEntriesFromStorage = (): DiaryEntry[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DiaryEntry[]) : [];
  } catch (error) {
    console.error("Failed to parse guest diary entries", error);
    return [];
  }
};

const writeGuestEntriesToStorage = (entries: DiaryEntry[]) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(entries));
};

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
  const [eventSummary, setEventSummary] = useState("");
  const [realization, setRealization] = useState("");
  const [emotionLabel, setEmotionLabel] = useState<string | null>(null);
  const [selfEsteemScore, setSelfEsteemScore] = useState(50);
  const [worthlessnessScore, setWorthlessnessScore] = useState(50);
  const [initialScore, setInitialScore] = useState<InitialScore | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [guestEntries, setGuestEntries] = useState<DiaryEntry[]>([]);

  const persistGuestEntries = useCallback(
    (data: DiaryEntry[], force = false) => {
      setGuestEntries(data);
      if (scope === "me" || force) {
        setEntries(data);
      }
      writeGuestEntriesToStorage(data);
    },
    [scope]
  );

  const enableGuestMode = useCallback((): DiaryEntry[] => {
    const stored = readGuestEntriesFromStorage();
    setGuestMode(true);
    setNeedsAuth(false);
    persistGuestEntries(stored, true);
    return stored;
  }, [persistGuestEntries]);

  const ensureGuestEntries = () => {
    if (guestEntries.length > 0) {
      return guestEntries;
    }
    return enableGuestMode();
  };

  const appendGuestEntry = (entry: DiaryEntry, force = false) => {
    const base = ensureGuestEntries();
    const updated = [entry, ...base];
    if (scope !== "me") {
      setScope("me");
    }
    persistGuestEntries(updated, force || scope !== "me");
    setGuestMode(true);
  };

  const removeGuestEntry = (entryId: string) => {
    const base = ensureGuestEntries();
    const updated = base.filter((entry) => entry.id !== entryId);
    persistGuestEntries(updated);
  };

  const updateGuestEntryVisibility = (entryId: string, visibility: DiaryVisibility) => {
    const base = ensureGuestEntries();
    const updated = base.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            visibility,
            published_at: visibility === "public" ? entry.published_at ?? new Date().toISOString() : null
          }
        : entry
    );
    persistGuestEntries(updated);
  };

  const resetComposer = (visibility: DiaryVisibility = form.visibility) => {
    setForm({ ...defaultForm, journalDate: today(), visibility });
    setFeelings([]);
    setEventSummary("");
    setRealization("");
    setEmotionLabel(null);
  };

  useEffect(() => {
    if (scope === "me" && guestMode) {
      setEntries(guestEntries);
      setLoading(false);
      setNeedsAuth(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setNeedsAuth(false);
      try {
        const res = await fetch(`/api/diary/entries?scope=${scope}`, {
          cache: "no-store"
        });

        if (res.status === 401) {
          if (scope === "me") {
            enableGuestMode();
            return;
          }
          setNeedsAuth(true);
          setEntries([]);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to load entries");
        }

        const data = (await res.json()) as { entries: DiaryEntry[] };
        if (!cancelled) {
          setEntries(data.entries ?? []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("にっきの取得に失敗しました");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [scope, guestMode, guestEntries, enableGuestMode]);

  useEffect(() => {
    const loadInitialScore = async () => {
      try {
        const res = await fetch("/api/diary/initial-score", { cache: "no-store" });
        if (res.status === 401) {
          return;
        }
        if (!res.ok) {
          throw new Error("failed");
        }
        const data = await res.json();
        if (data.initialScore) {
          setInitialScore(data.initialScore);
          setSelfEsteemScore(data.initialScore.self_esteem_score);
          setWorthlessnessScore(data.initialScore.worthlessness_score);
        }
      } catch (err) {
        console.error(err);
        setInitialError("初期スコアの取得に失敗しました");
      }
    };
    loadInitialScore();
  }, []);

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

  const handleSelfScoreChange = (value: number) => {
    const clamped = Math.min(Math.max(value, 0), 100);
    setSelfEsteemScore(clamped);
    setWorthlessnessScore(100 - clamped);
  };

  const handleWorthScoreChange = (value: number) => {
    const clamped = Math.min(Math.max(value, 0), 100);
    setWorthlessnessScore(clamped);
    setSelfEsteemScore(100 - clamped);
  };

  const handleCreate = async () => {
    if (!form.content.trim()) {
      setSaveError("本文を入力してください");
      return;
    }
    if (!eventSummary.trim()) {
      setSaveError("出来事を入力してください");
      return;
    }
    if (!emotionLabel) {
      setSaveError("感情を選択してください");
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
          emotionLabel,
          eventSummary,
          realization: realization || null,
          selfEsteemScore,
          worthlessnessScore,
          visibility: form.visibility,
          journalDate: form.journalDate,
          feelings
        })
      });

      if (res.status === 401) {
        if (scope === "me") {
          const guestEntry: DiaryEntry = {
            id: generateGuestId(),
            user_id: "guest",
            title: form.title || null,
            content: form.content,
            mood_score: null,
            mood_label: null,
            mood_color: null,
            energy_level: null,
            emotion_label: emotionLabel,
            event_summary: eventSummary,
            realization: realization || null,
            self_esteem_score: selfEsteemScore,
            worthlessness_score: worthlessnessScore,
            visibility: form.visibility,
            published_at: form.visibility === "public" ? new Date().toISOString() : null,
            journal_date: form.journalDate,
            created_at: new Date().toISOString(),
            feelings
          };
          appendGuestEntry(guestEntry, true);
          resetComposer(form.visibility);
          return;
        }
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
      resetComposer(form.visibility);
    } catch (err) {
      console.error(err);
      setSaveError("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("この日記を削除しますか？")) return;
    if (guestMode) {
      removeGuestEntry(entryId);
      return;
    }
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
    if (guestMode) {
      updateGuestEntryVisibility(entryId, visibility);
      return;
    }
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

  return (
    <div className="space-y-10">
      <section className="grid gap-6">
        <Card className="border-none shadow-md">
          <CardContent className="p-6">
            <p className="mb-4 text-xs font-semibold text-tape-pink">今日の記録</p>
            <div className="space-y-4">
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="タイトル (任意)"
                className="w-full rounded-2xl border border-tape-beige bg-tape-cream/50 px-4 py-3 text-sm focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink"
              />
              <label className="flex flex-col gap-2 text-xs font-semibold text-tape-light-brown">
                出来事・状況
                <textarea
                  value={eventSummary}
                  onChange={(event) => setEventSummary(event.target.value)}
                  placeholder="印象に残った出来事を具体的に"
                  className="h-24 w-full rounded-2xl border border-tape-beige bg-white px-4 py-3 text-sm text-tape-brown focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink"
                />
              </label>
              <textarea
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                placeholder="出来事・感情・身体感覚を自由にメモ"
                className="h-32 w-full rounded-2xl border border-tape-beige bg-tape-cream/50 px-4 py-3 text-sm focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink"
              />
              <div>
                <p className="text-xs font-semibold text-tape-light-brown">今日感じた感情を選ぶ</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {emotionOptions.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setEmotionLabel(option.label)}
                      className={cn(
                        "rounded-2xl border px-3 py-2 text-left text-sm transition-all",
                        option.tone,
                        emotionLabel === option.label
                          ? "ring-2 ring-tape-pink"
                          : "opacity-80 hover:opacity-100"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-2 text-xs font-semibold text-tape-light-brown">
                気づき・意味づけ
                <textarea
                  value={realization}
                  onChange={(event) => setRealization(event.target.value)}
                  placeholder="なぜそう感じたのか、どんな発見があったか"
                  className="h-24 w-full rounded-2xl border border-tape-beige bg-white px-4 py-3 text-sm text-tape-brown focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-tape-beige bg-white/70 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-tape-light-brown">
                    <span>自己肯定感</span>
                    <span className="text-tape-brown">{selfEsteemScore}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={selfEsteemScore}
                    onChange={(event) => handleSelfScoreChange(Number(event.target.value))}
                    className="accent-tape-green mt-3 w-full"
                  />
                  <p className="mt-2 text-[11px] text-tape-light-brown">上げると無価値感が自動で下がります。</p>
                </div>
                <div className="rounded-2xl border border-tape-beige bg-white/70 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-tape-light-brown">
                    <span>無価値感</span>
                    <span className="text-tape-brown">{worthlessnessScore}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={worthlessnessScore}
                    onChange={(event) => handleWorthScoreChange(Number(event.target.value))}
                    className="accent-tape-pink mt-3 w-full"
                  />
                  <p className="mt-2 text-[11px] text-tape-light-brown">下げると自己肯定感が上がります。</p>
                </div>
              </div>
              {initialScore && (
                <p className="text-xs text-tape-light-brown">
                  初期計測: {initialScore.self_esteem_score}/{initialScore.worthlessness_score} ( {initialScore.measured_on} )
                </p>
              )}
              {initialError && <p className="text-xs text-tape-pink">{initialError}</p>}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-tape-light-brown">
                  記録日
                  <input
                    type="date"
                    value={form.journalDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, journalDate: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-tape-beige px-4 py-2 text-sm focus:border-tape-pink focus:outline-none"
                  />
                </label>
                <label className="text-xs font-semibold text-tape-light-brown">
                  公開設定
                  <select
                    value={form.visibility}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, visibility: event.target.value as DiaryVisibility }))
                    }
                    className="mt-2 w-full rounded-2xl border border-tape-beige bg-white px-4 py-2 text-sm focus:border-tape-pink focus:outline-none"
                  >
                    <option value="private">非公開</option>
                    <option value="followers">ゆる公開</option>
                    <option value="public">全体公開</option>
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-dashed border-tape-beige bg-tape-beige/30 p-4">
                <p className="text-xs font-semibold text-tape-light-brown">感情タグ (最大6個)</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {feelings.map((feeling) => (
                    <button
                      key={feeling.label}
                      type="button"
                      onClick={() => removeFeeling(feeling.label)}
                      className="inline-flex items-center rounded-full bg-tape-pink/20 px-3 py-1 text-xs font-semibold text-tape-brown"
                    >
                      {feeling.label}
                      <span className="ml-2 text-[10px] text-tape-brown/70">{feeling.intensity}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[2fr,1fr,auto]">
                  <input
                    value={newFeeling.label}
                    onChange={(event) => setNewFeeling((prev) => ({ ...prev, label: event.target.value }))}
                    placeholder="例: 不安 / 期待"
                    className="rounded-2xl border border-tape-beige px-3 py-2 text-sm focus:border-tape-pink focus:outline-none"
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={newFeeling.intensity}
                    onChange={(event) => setNewFeeling((prev) => ({ ...prev, intensity: Number(event.target.value) }))}
                    className="accent-tape-pink"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addFeeling}
                  >
                    追加
                  </Button>
                </div>
              </div>

              {saveError && <p className="text-xs text-tape-pink">{saveError}</p>}

              <Button
                type="button"
                onClick={handleCreate}
                disabled={isSaving}
                className="w-full bg-tape-brown text-white hover:bg-tape-brown/90"
              >
                {isSaving ? "保存中..." : "かんじょうを記録"}
              </Button>
            </div>
          </CardContent>
        </Card>

      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-full bg-tape-beige p-1 text-xs font-semibold text-tape-light-brown">
            {["me", "public"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setScope(tab as DiaryScope)}
                className={cn(
                  "rounded-full px-4 py-2 transition-all",
                  scope === tab ? "bg-white shadow text-tape-brown" : "text-tape-light-brown hover:text-tape-brown"
                )}
              >
                {tab === "me" ? "マイ日記" : "公開フィード"}
              </button>
            ))}
          </div>
          {guestMode && scope === "me" && (
            <span className="rounded-full bg-tape-pink/10 px-3 py-1 text-xs font-semibold text-tape-pink">
              ゲストモード（この端末に保存）
            </span>
          )}
          {needsAuth && scope === "me" && !guestMode && (
            <p className="text-xs text-tape-pink">ログインすると自分の日記が確認できます。</p>
          )}
        </div>

        {loading ? (
          <p className="rounded-2xl border border-tape-beige bg-white/70 px-4 py-6 text-sm text-tape-light-brown">
            読み込み中...
          </p>
        ) : error ? (
          <p className="rounded-2xl border border-tape-pink/30 bg-tape-pink/10 px-4 py-6 text-sm text-tape-pink">
            {error}
          </p>
        ) : entries.length === 0 ? (
          <p className="rounded-2xl border border-tape-beige bg-white/70 px-4 py-6 text-sm text-tape-light-brown">
            まだ日記がありません。
          </p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="border-none shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-tape-light-brown">
                    <span>{entry.journal_date}</span>
                    {entry.emotion_label && (
                      <span className="rounded-full bg-tape-pink/10 px-3 py-1 text-xs font-semibold text-tape-pink">
                        {entry.emotion_label}
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        entry.visibility === "public"
                          ? "bg-tape-green/20 text-tape-brown"
                          : entry.visibility === "followers"
                          ? "bg-tape-orange/20 text-tape-brown"
                          : "bg-tape-beige text-tape-brown"
                      )}
                    >
                      {entry.visibility === "public"
                        ? "全体公開"
                        : entry.visibility === "followers"
                        ? "ゆる公開"
                        : "非公開"}
                    </span>
                  </div>
                  {entry.event_summary && (
                    <div className="mt-3 rounded-2xl border border-tape-beige bg-white/70 p-3 text-sm text-tape-brown">
                      <p className="text-xs font-semibold text-tape-light-brown">出来事</p>
                      <p className="mt-1 whitespace-pre-wrap">{entry.event_summary}</p>
                    </div>
                  )}
                  <h3 className="mt-3 text-lg font-bold text-tape-brown">{entry.title ?? "(タイトルなし)"}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-tape-brown/90">{entry.content}</p>
                  {entry.realization && (
                    <div className="mt-3 rounded-2xl border border-dashed border-tape-beige p-3 text-sm text-tape-brown">
                      <p className="text-xs font-semibold text-tape-light-brown">気づき</p>
                      <p className="mt-1 whitespace-pre-wrap">{entry.realization}</p>
                    </div>
                  )}
                  {(entry.self_esteem_score != null || entry.worthlessness_score != null) && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-tape-beige bg-white/60 p-3">
                        <p className="text-xs font-semibold text-tape-light-brown">自己肯定感</p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1 rounded-full bg-tape-beige">
                            <div className="h-2 rounded-full bg-tape-green" style={{ width: `${(entry.self_esteem_score ?? 0)}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-tape-brown">{entry.self_esteem_score ?? "-"}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-tape-beige bg-white/60 p-3">
                        <p className="text-xs font-semibold text-tape-light-brown">無価値感</p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1 rounded-full bg-tape-beige">
                            <div className="h-2 rounded-full bg-tape-pink" style={{ width: `${(entry.worthlessness_score ?? 0)}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-tape-brown">{entry.worthlessness_score ?? "-"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {entry.feelings?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {entry.feelings.map((feeling) => (
                        <span
                          key={`${entry.id}-${feeling.label}`}
                          className="inline-flex items-center rounded-full bg-tape-pink/10 px-3 py-1 text-xs font-semibold text-tape-brown"
                        >
                          {feeling.label}
                          <span className="ml-1 text-[10px] opacity-70">{feeling.intensity}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {scope === "me" && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVisibilityChange(entry.id, "public")}
                      >
                        公開する
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVisibilityChange(entry.id, "private")}
                      >
                        非公開
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-tape-pink hover:bg-tape-pink/10 hover:text-tape-pink"
                        onClick={() => handleDelete(entry.id)}
                      >
                        削除
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
