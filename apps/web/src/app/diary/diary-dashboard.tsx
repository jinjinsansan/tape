"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SELF_ESTEEM_DRAFT_STORAGE_KEY } from "@/lib/self-esteem/constants";
import type { DiaryDraftStorage } from "@/lib/self-esteem/types";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@tape/supabase";

import type { DiaryVisibility, DiaryAiCommentStatus } from "@tape/supabase";

type DiaryTab = "mine" | "public";

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
  ai_comment_status: DiaryAiCommentStatus;
  ai_comment: string | null;
  ai_comment_generated_at: string | null;
  counselor_memo: string | null;
  counselor_name: string | null;
  is_visible_to_user: boolean;
  is_ai_comment_public: boolean;
  is_counselor_comment_public: boolean;
  is_shareable: boolean;
  share_count: number;
  published_at: string | null;
  journal_date: string;
  created_at: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const defaultForm = {
  title: "",
  content: "",
  visibility: "private" as DiaryVisibility,
  journalDate: today(),
  shareAiComment: true,
  shareCounselorComment: false,
  shareToFeed: true
};

type InitialScore = {
  self_esteem_score: number;
  worthlessness_score: number;
  measured_on: string;
};

type PreviousScoreInfo = {
  source: "initial" | "entry";
  date: string;
  worthlessness_score: number;
  self_esteem_score: number | null;
};

const formatScoreDate = (input: string) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

type EmotionOption = {
  label: string;
  tone: string;
  description: string;
};

const emotionOptions: EmotionOption[] = [
  { label: "恐怖", tone: "bg-purple-100 text-purple-800 border-purple-200", description: "息苦しさ、震え、冷や汗など身体の反応が強く現れる状態。" },
  { label: "悲しみ", tone: "bg-blue-100 text-blue-800 border-blue-200", description: "喪失感や心に穴が空いたような感覚。" },
  { label: "怒り", tone: "bg-red-100 text-red-800 border-red-200", description: "体温が上がり、拳を握るようなエネルギー。" },
  { label: "悔しい", tone: "bg-green-100 text-green-800 border-green-200", description: "やり返したい、もっと出来たはずというエネルギー。" },
  { label: "無価値感", tone: "bg-gray-100 text-gray-800 border-gray-300", description: "存在意義が無いと感じる深い自己否定。" },
  { label: "罪悪感", tone: "bg-orange-100 text-orange-800 border-orange-200", description: "申し訳なさや取り返しがつかないと感じる思い。" },
  { label: "寂しさ", tone: "bg-indigo-100 text-indigo-800 border-indigo-200", description: "孤独を感じ、誰かに会いたくなる気持ち。" },
  { label: "恥ずかしさ", tone: "bg-pink-100 text-pink-800 border-pink-200", description: "隠れたくなる、顔が赤くなる感覚。" },
  { label: "嬉しい", tone: "bg-yellow-100 text-yellow-800 border-yellow-200", description: "心が弾み、自然と笑顔になる感覚。" },
  { label: "感謝", tone: "bg-teal-100 text-teal-800 border-teal-200", description: "支えられた温かさや恩返ししたい気持ち。" },
  { label: "達成感", tone: "bg-lime-100 text-lime-800 border-lime-200", description: "やり切った誇らしさ、努力が報われた感覚。" },
  { label: "幸せ", tone: "bg-amber-100 text-amber-800 border-amber-200", description: "満たされて安心している穏やかな状態。" }
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

const clearGuestEntriesFromStorage = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(GUEST_STORAGE_KEY);
};

const derivePreviousScoreFromEntries = (entries: DiaryEntry[]): PreviousScoreInfo | null => {
  const target = entries.find((entry) => entry.worthlessness_score != null);
  if (!target || target.worthlessness_score == null) {
    return null;
  }

  return {
    source: "entry",
    date: target.journal_date,
    worthlessness_score: target.worthlessness_score,
    self_esteem_score: target.self_esteem_score ?? null
  };
};

export function DiaryDashboard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [activeTab, setActiveTab] = useState<DiaryTab>("mine");
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [commentVisibilitySavingId, setCommentVisibilitySavingId] = useState<string | null>(null);
  const [eventSummary, setEventSummary] = useState("");
  const [realization, setRealization] = useState("");
  const [selfEsteemTestDate, setSelfEsteemTestDate] = useState<string | null>(null);
  const [testDraftApplied, setTestDraftApplied] = useState(false);
  const [emotionLabel, setEmotionLabel] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const isWorthlessnessSelected = emotionLabel === "無価値感";

  const handleEmotionSelect = (label: string) => {
    setEmotionLabel(label);
  };
  const [selfEsteemScore, setSelfEsteemScore] = useState(50);
  const [worthlessnessScore, setWorthlessnessScore] = useState(50);
  const [initialScore, setInitialScore] = useState<InitialScore | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [previousScoreInfo, setPreviousScoreInfo] = useState<PreviousScoreInfo | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [guestEntries, setGuestEntries] = useState<DiaryEntry[]>([]);
  const latestMine = useMemo(() => entries.slice(0, 5), [entries]);
  const latestPublicMine = useMemo(
    () => entries.filter((entry) => entry.visibility === "public").slice(0, 5),
    [entries]
  );
  const displayedEntries = activeTab === "mine" ? latestMine : latestPublicMine;

  const syncPreviousFromEntries = useCallback(
    (list: DiaryEntry[]) => {
      const candidate = list.find((entry) => entry.worthlessness_score != null);
      if (candidate && candidate.worthlessness_score != null) {
        setPreviousScoreInfo({
          source: "entry",
          date: candidate.journal_date,
          worthlessness_score: candidate.worthlessness_score,
          self_esteem_score: candidate.self_esteem_score ?? null
        });
        return;
      }

      if (initialScore) {
        setPreviousScoreInfo({
          source: "initial",
          date: initialScore.measured_on,
          worthlessness_score: initialScore.worthlessness_score,
          self_esteem_score: initialScore.self_esteem_score
        });
        return;
      }

      setPreviousScoreInfo(null);
    },
    [initialScore]
  );

  const persistGuestEntries = useCallback((data: DiaryEntry[]) => {
    setGuestEntries(data);
    setEntries(data);
    setPreviousScoreInfo(derivePreviousScoreFromEntries(data));
    writeGuestEntriesToStorage(data);
  }, []);

  const enableGuestMode = useCallback((): DiaryEntry[] => {
    const stored = readGuestEntriesFromStorage();
    setGuestMode(true);
    persistGuestEntries(stored);
    return stored;
  }, [persistGuestEntries]);

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    if (accessToken) {
      return { Authorization: `Bearer ${accessToken}` };
    }
    return {};
  }, [accessToken]);

  const ensureGuestEntries = () => {
    if (guestEntries.length > 0) {
      return guestEntries;
    }
    return enableGuestMode();
  };

  const appendGuestEntry = (entry: DiaryEntry) => {
    const base = ensureGuestEntries();
    const updated = [entry, ...base];
    if (activeTab !== "mine") {
      setActiveTab("mine");
    }
    persistGuestEntries(updated);
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

  const syncGuestEntriesToCloud = useCallback(async () => {
    if (typeof window === "undefined") {
      return false;
    }
    const stored = readGuestEntriesFromStorage();
    if (!stored.length) {
      return false;
    }

    for (const entry of [...stored].reverse()) {
      const payload = {
        title: entry.title,
        content: entry.content,
        emotionLabel: entry.emotion_label,
        eventSummary: entry.event_summary,
        realization: entry.realization,
        selfEsteemScore: entry.self_esteem_score ?? undefined,
        worthlessnessScore: entry.worthlessness_score ?? undefined,
        visibility: entry.visibility,
        journalDate: entry.journal_date
      };

      const res = await fetch("/api/diary/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders())
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        console.warn("Cloud sync aborted: unauthorized");
        return false;
      }

      if (!res.ok) {
        console.error("Failed to sync guest entry", await res.text());
        return false;
      }
    }

    clearGuestEntriesFromStorage();
    setGuestEntries([]);
    return true;
  }, [getAuthHeaders]);

  const getStoredSelfEsteemDraft = useCallback((): DiaryDraftStorage | null => {
    if (typeof window === "undefined") {
      return null;
    }
    const raw = window.localStorage.getItem(SELF_ESTEEM_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as DiaryDraftStorage;
      if (parsed?.source !== "self_esteem_test") {
        return null;
      }
      return parsed;
    } catch (error) {
      console.error("Failed to parse self esteem test draft", error);
      return null;
    }
  }, []);

  const clearStoredSelfEsteemDraft = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(SELF_ESTEEM_DRAFT_STORAGE_KEY);
  }, []);

  const resetComposer = (
    visibility: DiaryVisibility = form.visibility,
    options: { clearTestDraft?: boolean } = {}
  ) => {
    setForm({ ...defaultForm, journalDate: today(), visibility });
    setEventSummary("");
    setRealization("");
    setEmotionLabel(null);
    if (options.clearTestDraft) {
      setSelfEsteemTestDate(null);
      setTestDraftApplied(false);
      clearStoredSelfEsteemDraft();
    }
  };

  useEffect(() => {
    if (!guestMode) {
      return;
    }
    setEntries(guestEntries);
    setLoading(false);
  }, [guestMode, guestEntries]);

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      setAccessToken(data.session?.access_token ?? null);
      setSessionChecked(true);
    };
    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
      setSessionChecked(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (guestMode) {
      return;
    }

    if (!sessionChecked) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // ゲストエントリーをクラウドに同期
        const synced = await syncGuestEntriesToCloud();
        
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/diary/entries?scope=me&limit=50`, {
          cache: "no-store",
          headers
        });

        if (res.status === 401) {
          enableGuestMode();
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to load entries");
        }

        const data = (await res.json()) as { entries: DiaryEntry[] };
        if (!cancelled) {
          const nextEntries = data.entries ?? [];
          setEntries(nextEntries);
          syncPreviousFromEntries(nextEntries);
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
  }, [guestMode, sessionChecked, enableGuestMode, syncPreviousFromEntries, syncGuestEntriesToCloud, getAuthHeaders]);

  useEffect(() => {
    if (!sessionChecked) {
      return;
    }

    const loadInitialScore = async () => {
      try {
        const res = await fetch("/api/diary/initial-score", {
          cache: "no-store",
          headers: await getAuthHeaders()
        });
        if (res.status === 401) {
          setPreviousScoreInfo(derivePreviousScoreFromEntries(readGuestEntriesFromStorage()));
          return;
        }
        if (!res.ok) {
          throw new Error("failed");
        }
        const data = (await res.json()) as {
          initialScore: InitialScore | null;
          previousScore: PreviousScoreInfo | null;
        };
        if (data.initialScore) {
          setInitialScore(data.initialScore);
          setSelfEsteemScore(data.initialScore.self_esteem_score);
          setWorthlessnessScore(data.initialScore.worthlessness_score);
        }
        if (data.previousScore) {
          setPreviousScoreInfo(data.previousScore);
        } else if (data.initialScore) {
          setPreviousScoreInfo({
            source: "initial",
            date: data.initialScore.measured_on,
            worthlessness_score: data.initialScore.worthlessness_score,
            self_esteem_score: data.initialScore.self_esteem_score
          });
        } else {
          setPreviousScoreInfo(null);
        }
      } catch (err) {
        console.error(err);
        setInitialError("初期スコアの取得に失敗しました");
      }
    };
    loadInitialScore();
  }, [sessionChecked, getAuthHeaders]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (testDraftApplied) {
      return;
    }
    const draft = getStoredSelfEsteemDraft();
    if (!draft) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      content: draft.content,
      journalDate: draft.journalDate ?? today()
    }));
    setEventSummary(draft.eventSummary);
    setEmotionLabel(draft.emotionLabel);
    setSelfEsteemScore(draft.selfEsteemScore);
    setWorthlessnessScore(draft.worthlessnessScore);
    setSelfEsteemTestDate(draft.testDate);
    setTestDraftApplied(true);
    showToast("success", "自己肯定感テストの結果を読み込みました");
  }, [getStoredSelfEsteemDraft, showToast, testDraftApplied]);

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

  const handleDiscardTestDraft = useCallback(() => {
    setSelfEsteemTestDate(null);
    setTestDraftApplied(false);
    clearStoredSelfEsteemDraft();
  }, [clearStoredSelfEsteemDraft]);

  const handleCreate = async () => {
    if (!form.content.trim()) {
      setSaveError("本文を入力してください");
      return;
    }
    if (!eventSummary.trim()) {
      setSaveError("出来事・状況の要約メモを入力してください");
      return;
    }
    if (!emotionLabel) {
      setSaveError("感情を選択してください");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = {
        title: form.title || null,
        content: form.content,
        emotionLabel,
        eventSummary,
        realization: realization || null,
        selfEsteemScore,
        worthlessnessScore,
        visibility: form.visibility,
        journalDate: form.journalDate,
        selfEsteemTestDate: selfEsteemTestDate ?? undefined,
      isAiCommentPublic: form.shareAiComment,
      isCounselorCommentPublic: form.shareCounselorComment,
      isShareable: form.visibility === "public" ? form.shareToFeed : false
      };

      const res = await fetch("/api/diary/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders())
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
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
          ai_comment_status: "idle",
          ai_comment: null,
          ai_comment_generated_at: null,
          counselor_memo: null,
          counselor_name: null,
          is_visible_to_user: true,
          is_ai_comment_public: form.shareAiComment,
          is_counselor_comment_public: form.shareCounselorComment,
          is_shareable: form.visibility === "public" ? form.shareToFeed : false,
          share_count: 0,
          published_at: form.visibility === "public" ? new Date().toISOString() : null,
          journal_date: form.journalDate,
          created_at: new Date().toISOString()
        };
        appendGuestEntry(guestEntry);
        setPreviousScoreInfo({
          source: "entry",
          date: guestEntry.journal_date,
          worthlessness_score: guestEntry.worthlessness_score ?? worthlessnessScore,
          self_esteem_score: guestEntry.self_esteem_score ?? selfEsteemScore
        });
        resetComposer(form.visibility, { clearTestDraft: true });
        showToast("success", "日記を保存しました（この端末に保管中）");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to create entry");
      }

      const data = (await res.json()) as { entry: DiaryEntry };
      const createdEntry = data.entry;
      setEntries((prev) => [data.entry, ...prev]);
      setPreviousScoreInfo({
        source: "entry",
        date: createdEntry.journal_date,
        worthlessness_score: createdEntry.worthlessness_score ?? worthlessnessScore,
        self_esteem_score: createdEntry.self_esteem_score ?? selfEsteemScore
      });
      resetComposer(form.visibility, { clearTestDraft: true });
      showToast("success", "日記を保存しました");
    } catch (err) {
      console.error(err);
      setSaveError("保存に失敗しました");
      showToast("error", "保存に失敗しました");
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
        method: "DELETE",
        headers: await getAuthHeaders()
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete entry");
      }
      setEntries((prev) => {
        const next = prev.filter((entry) => entry.id !== entryId);
        if (!guestMode) {
          syncPreviousFromEntries(next);
        }
        return next;
      });
      showToast("success", "日記を削除しました");
    } catch (err) {
      console.error(err);
      showToast("error", "削除に失敗しました");
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
          "Content-Type": "application/json",
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({ visibility })
      });
      if (!res.ok) {
        throw new Error("Failed to update visibility");
      }
      const data = (await res.json()) as { entry: DiaryEntry };
      setEntries((prev) => prev.map((entry) => (entry.id === entryId ? data.entry : entry)));
      showToast("success", "公開設定を更新しました");
    } catch (err) {
      console.error(err);
      showToast("error", "公開設定の更新に失敗しました");
    }
  };

  const handlePublishingPreferenceChange = async (
    entryId: string,
    updates: { is_ai_comment_public?: boolean; is_counselor_comment_public?: boolean; is_shareable?: boolean }
  ) => {
    if (guestMode) {
      const updated = ensureGuestEntries().map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              ...updates
            }
          : entry
      );
      persistGuestEntries(updated);
      return;
    }

    const body: Record<string, boolean> = {};
    if (updates.is_ai_comment_public !== undefined) {
      body.isAiCommentPublic = updates.is_ai_comment_public;
    }
    if (updates.is_counselor_comment_public !== undefined) {
      body.isCounselorCommentPublic = updates.is_counselor_comment_public;
    }
    if (updates.is_shareable !== undefined) {
      body.isShareable = updates.is_shareable;
    }
    if (Object.keys(body).length === 0) {
      return;
    }

    setCommentVisibilitySavingId(entryId);
    try {
      const res = await fetch(`/api/diary/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders())
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error("Failed to update comment visibility");
      }

      const data = (await res.json()) as { entry: DiaryEntry };
      setEntries((prev) => prev.map((entry) => (entry.id === entryId ? data.entry : entry)));
      showToast("success", "公開設定を保存しました");
    } catch (err) {
      console.error(err);
      showToast("error", "コメント公開設定の更新に失敗しました");
    } finally {
      setCommentVisibilitySavingId(null);
    }
  };

  return (
    <div className="space-y-10">
      {toast && (
        <div
          className={cn(
            "fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-full px-6 py-2 text-sm font-semibold shadow-lg transition-all",
            toast.type === "success" ? "bg-tape-brown text-white" : "bg-tape-pink text-white"
          )}
        >
          {toast.message}
        </div>
      )}
      <section className="grid gap-6">
        <Card className="border-none shadow-md">
          <CardContent className="p-6">
            <p className="mb-4 text-xs font-semibold text-tape-pink">今日の記録</p>
            <p className="mb-3 text-[11px] text-tape-light-brown">※ 日記を投稿するたびに +3pt がウォレットへ加算されます。</p>
            <div className="space-y-4">
              <label className="flex flex-col gap-2 text-xs font-semibold text-tape-light-brown">
                タイトル
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="タイトル (任意)"
                  className="w-full rounded-2xl border border-tape-beige bg-tape-cream/50 px-4 py-3 text-sm focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-tape-light-brown">
                出来事・状況の要約メモ
                <textarea
                  value={eventSummary}
                  onChange={(event) => setEventSummary(event.target.value)}
                  placeholder="出来事や状況を短くまとめてください"
                  className="h-24 w-full rounded-2xl border border-tape-beige bg-white px-4 py-3 text-base md:text-sm text-tape-brown focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-tape-light-brown">
                本文
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="感じたことや考えたことを自由に書いてください"
                  className="h-32 w-full rounded-2xl border border-tape-beige bg-tape-cream/50 px-4 py-3 text-base md:text-sm focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink"
                />
              </label>
              <div>
                <p className="text-xs font-semibold text-tape-light-brown">今日感じた感情を選ぶ</p>
                <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-3">
                  {emotionOptions.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleEmotionSelect(option.label)}
                      aria-pressed={emotionLabel === option.label}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-left text-xs font-semibold transition-all duration-200",
                        option.tone,
                        emotionLabel === option.label
                          ? "ring-2 ring-tape-pink shadow-lg scale-[1.02]"
                          : "opacity-80 hover:opacity-100 hover:-translate-y-0.5 hover:shadow"
                      )}
                    >
                      <span className="block text-sm">{option.label}</span>
                      <span className="mt-0.5 block text-[10px] font-normal text-tape-brown/70">
                        {option.description}
                      </span>
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
                  className="h-24 w-full rounded-2xl border border-tape-beige bg-white px-4 py-3 text-base md:text-sm text-tape-brown focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink"
                />
              </label>

              {selfEsteemTestDate && (
                <div className="flex flex-col gap-2 rounded-2xl border border-tape-beige bg-white/75 p-4 text-xs text-tape-brown md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">自己肯定感テスト（{selfEsteemTestDate}）の結果を反映中</p>
                    <p className="mt-1 text-[11px] text-tape-light-brown">
                      スライダーを調整すると最新のスコアとして日記に保存されます。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDiscardTestDraft}
                    className="rounded-full border border-tape-beige px-3 py-1 text-[11px] font-semibold text-tape-light-brown transition hover:border-tape-pink hover:text-tape-pink"
                  >
                    結果を破棄する
                  </button>
                </div>
              )}

              {isWorthlessnessSelected && (
                <>
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
                  {previousScoreInfo && (
                    <p className="text-[11px] text-tape-light-brown">
                      前回の無価値感: <span className="font-semibold text-tape-pink">{previousScoreInfo.worthlessness_score}</span>
                      <span className="ml-1">
                        ({previousScoreInfo.source === "initial" ? "初期スコア" : "前回の日記"} / {formatScoreDate(previousScoreInfo.date)})
                      </span>
                    </p>
                  )}
                  {initialScore && (
                    <p className="text-xs text-tape-light-brown">
                      初期計測: {initialScore.self_esteem_score}/{initialScore.worthlessness_score} ( {initialScore.measured_on} )
                    </p>
                  )}
                  {!initialScore && !previousScoreInfo && (
                    <p className="text-xs text-tape-light-brown">
                      まだ診断を行っていません。<Link href="/diary/how-to" className="underline decoration-dotted">使い方ページ</Link>から自己肯定感診断を実施すると、無価値感の推移グラフに反映されます。
                    </p>
                  )}
                </>
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
                      setForm((prev) => {
                        const nextVisibility = event.target.value as DiaryVisibility;
                        const isPublic = nextVisibility === "public";
                        const wasPublic = prev.visibility === "public";
                        return {
                          ...prev,
                          visibility: nextVisibility,
                          shareAiComment: isPublic
                            ? wasPublic
                              ? prev.shareAiComment
                              : true
                            : false,
                          shareCounselorComment: isPublic ? prev.shareCounselorComment : false,
                          shareToFeed: isPublic ? prev.shareToFeed : false
                        };
                      })
                    }
                    className="mt-2 w-full rounded-2xl border border-tape-beige bg-white px-4 py-2 text-sm focus:border-tape-pink focus:outline-none"
                  >
                    <option value="private">非公開（自分のみ）</option>
                    <option value="followers">公開（カウンセラー共有）</option>
                    <option value="public">みんなの日記に公開</option>
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-tape-beige bg-white/70 p-4 text-xs text-tape-brown">
                <p className="font-semibold text-tape-light-brown">コメント公開設定</p>
                <div className="mt-3 space-y-2 text-sm">
                  <label className="flex items-center justify-between gap-3">
                    <span>ミシェルAIのコメントを公開</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-tape-beige"
                      checked={form.shareAiComment}
                      disabled={form.visibility !== "public"}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, shareAiComment: event.target.checked }))
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>カウンセラーのコメントを公開</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-tape-beige"
                      checked={form.shareCounselorComment}
                      disabled={form.visibility !== "public"}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, shareCounselorComment: event.target.checked }))
                      }
                    />
                  </label>
                </div>
                {form.visibility !== "public" && (
                  <p className="mt-2 text-[11px] text-tape-light-brown">
                    「みんなの日記」に公開したときのみ有効になります。
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-tape-beige bg-white/70 p-4 text-xs text-tape-brown">
                <p className="font-semibold text-tape-light-brown">SNSシェア設定</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span>日記カードにシェアボタンを表示</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-tape-beige"
                    checked={form.shareToFeed}
                    disabled={form.visibility !== "public"}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, shareToFeed: event.target.checked }))
                    }
                  />
                </div>
                <p className="mt-2 text-[11px] text-tape-light-brown">
                  こちらをオンにすると、公開された日記をSNSでシェアできるようになります。
                </p>
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
            {["mine", "public"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab as DiaryTab)}
                className={cn(
                  "rounded-full px-4 py-2 transition-all",
                  activeTab === tab ? "bg-white shadow text-tape-brown" : "text-tape-light-brown hover:text-tape-brown"
                )}
              >
                {tab === "mine" ? "マイ日記" : "みんなの日記"}
              </button>
            ))}
          </div>
          {guestMode && activeTab === "mine" && (
            <span className="rounded-full bg-tape-pink/10 px-3 py-1 text-xs font-semibold text-tape-pink">
              ゲストモード（この端末に保存）
            </span>
          )}
          <Link href="/diary/history" className="text-xs font-semibold text-tape-pink hover:text-tape-brown">
            過去の日記一覧へ →
          </Link>
        </div>
        <p className="text-[11px] text-tape-light-brown">
          {activeTab === "mine" ? "最新5件のマイ日記を表示中" : "みんなの日記に公開した最新5件を表示中"}
        </p>

        {loading ? (
          <p className="rounded-2xl border border-tape-beige bg-white/70 px-4 py-6 text-sm text-tape-light-brown">
            読み込み中...
          </p>
        ) : error ? (
          <p className="rounded-2xl border border-tape-pink/30 bg-tape-pink/10 px-4 py-6 text-sm text-tape-pink">
            {error}
          </p>
        ) : displayedEntries.length === 0 ? (
          <p className="rounded-2xl border border-tape-beige bg-white/70 px-4 py-6 text-sm text-tape-light-brown">
            {activeTab === "mine" ? "まだ日記がありません。" : "まだ「みんなの日記」に公開した記録はありません。"}
          </p>
        ) : (
          <div className="space-y-4">
            {displayedEntries.map((entry) => (
              <Card key={entry.id} className="border-none shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-tape-light-brown">
                    <span>{entry.journal_date}</span>
                    {entry.emotion_label && (
                      <span className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        emotionOptions.find((opt) => opt.label === entry.emotion_label)?.tone ?? "bg-tape-pink/10 text-tape-pink"
                      )}>
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
                        ? "みんなの日記"
                        : entry.visibility === "followers"
                        ? "公開（カウンセラー共有）"
                        : "非公開（下書き）"}
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

                  <div className="mt-4 rounded-2xl border border-tape-beige bg-white/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-tape-light-brown">
                      <span>コメント公開設定</span>
                      <span className="text-[11px]">
                        {entry.visibility === "public" ? "みんなの日記に公開中" : "まだ非公開"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-3 text-sm text-tape-brown">
                      <label className="flex items-center justify-between gap-3">
                        <span>ミシェルAIのコメントを公開</span>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-tape-beige"
                          checked={entry.is_ai_comment_public}
                          disabled={entry.visibility !== "public" || commentVisibilitySavingId === entry.id}
                          onChange={(event) =>
                            handlePublishingPreferenceChange(entry.id, {
                              is_ai_comment_public: event.target.checked
                            })
                          }
                        />
                      </label>
                      <label className="flex items-center justify-between gap-3">
                        <span>カウンセラーのコメントを公開</span>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-tape-beige"
                          checked={entry.is_counselor_comment_public}
                          disabled={entry.visibility !== "public" || commentVisibilitySavingId === entry.id}
                          onChange={(event) =>
                            handlePublishingPreferenceChange(entry.id, {
                              is_counselor_comment_public: event.target.checked
                            })
                          }
                        />
                      </label>
                      <label className="flex items-center justify-between gap-3">
                        <span>SNSシェアを許可</span>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-tape-beige"
                          checked={entry.is_shareable}
                          disabled={entry.visibility !== "public" || commentVisibilitySavingId === entry.id}
                          onChange={(event) =>
                            handlePublishingPreferenceChange(entry.id, {
                              is_shareable: event.target.checked
                            })
                          }
                        />
                      </label>
                    </div>
                    {entry.visibility !== "public" && (
                      <p className="mt-2 text-[11px] text-tape-light-brown">
                        「みんなに公開」にすると設定できます。
                      </p>
                    )}
                    {commentVisibilitySavingId === entry.id && (
                      <p className="mt-2 text-[11px] text-tape-light-brown">更新中...</p>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVisibilityChange(entry.id, "public")}
                    >
                      みんなに公開
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVisibilityChange(entry.id, "followers")}
                    >
                      カウンセラー共有
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVisibilityChange(entry.id, "private")}
                    >
                      非公開にする
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
