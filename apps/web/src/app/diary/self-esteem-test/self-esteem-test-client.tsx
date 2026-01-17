"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SELF_ESTEEM_DRAFT_STORAGE_KEY } from "@/lib/self-esteem/constants";
import { addDaysToDateString, getTodayJstDate } from "@/lib/date/jst";
import type {
  AnswerValue,
  DiaryDraftPayload,
  SelfEsteemQuestion,
  SelfEsteemSubmitResponse,
  SelfEsteemTestStatus
} from "@/lib/self-esteem/types";

const ANSWER_OPTIONS: { value: AnswerValue; label: string }[] = [
  { value: 1, label: "全くそう思わない" },
  { value: 2, label: "あまりそう思わない" },
  { value: 3, label: "どちらでもない" },
  { value: 4, label: "ややそう思う" },
  { value: 5, label: "とてもそう思う" }
];

type AnswerState = Record<string, AnswerValue | null>;

const storeDraft = (draft: DiaryDraftPayload) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SELF_ESTEEM_DRAFT_STORAGE_KEY,
      JSON.stringify({ ...draft, storedAt: new Date().toISOString() })
    );
  } catch (error) {
    console.warn("Failed to store diary draft", error);
  }
};

export const SelfEsteemTestClient = () => {
  const router = useRouter();
  const [status, setStatus] = useState<SelfEsteemTestStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [questions, setQuestions] = useState<SelfEsteemQuestion[]>([]);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [view, setView] = useState<"questions" | "loading" | "result">("questions");
  const [result, setResult] = useState<SelfEsteemSubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [postingDiary, setPostingDiary] = useState(false);
  const [restoredFromServer, setRestoredFromServer] = useState(false);
  const yesterdayJst = useMemo(() => addDaysToDateString(getTodayJstDate(), -1), []);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const response = await fetch("/api/self-esteem-test/status", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("failed");
      }
      const payload = await response.json();
      setStatus(payload.status);
    } catch (err) {
      console.error(err);
      setError("ステータスの取得に失敗しました");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    setError(null);
    setView("questions");
    setResult(null);
    setAnswers({});

    try {
      const response = await fetch("/api/self-esteem-test/questions", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("failed");
      }
      const payload = await response.json();
      setQuestions(payload.questions ?? []);
    } catch (err) {
      console.error(err);
      setError("今日の問題を取得できませんでした");
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!status || !status.canTakeTest || status.hasCompletedToday) return;
    loadQuestions();
  }, [status, loadQuestions]);

  useEffect(() => {
    if (
      !status ||
      !status.hasCompletedToday ||
      status.hasPostedToday ||
      result ||
      restoredFromServer
    ) {
      return;
    }
    let cancelled = false;
    const restore = async () => {
      try {
        setView("loading");
        const response = await fetch("/api/self-esteem-test/result", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("failed");
        }
        const payload = (await response.json()) as SelfEsteemSubmitResponse;
        if (!cancelled) {
          setResult(payload);
          setView("result");
          setRestoredFromServer(true);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("前回の計測結果を読み込めませんでした");
          setView("questions");
        }
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, [restoredFromServer, result, status]);

  const answeredCount = useMemo(() => Object.values(answers).filter(Boolean).length, [answers]);
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const handleAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      setError("すべての質問に回答してください");
      return;
    }
    setError(null);
    setView("loading");
    try {
      const response = await fetch("/api/self-esteem-test/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((question) => ({
            questionId: question.id,
            value: answers[question.id]
          }))
        })
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      const payload = (await response.json()) as SelfEsteemSubmitResponse;
      setResult(payload);
      setRestoredFromServer(true);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              hasCompletedToday: true,
              lastScore: payload.selfEsteemScore
            }
          : prev
      );
      setTimeout(() => setView("result"), 700);
    } catch (err) {
      console.error(err);
      setError("採点中にエラーが発生しました");
      setView("questions");
    }
  };

  const handleRetake = async () => {
    await loadQuestions();
  };

  const handleGoDiary = async () => {
    if (!result) return;
    setPostingDiary(true);
    try {
      const response = await fetch("/api/self-esteem-test/post-diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      const payload = (await response.json()) as { draft: DiaryDraftPayload };
      storeDraft(payload.draft);
      router.push("/diary");
    } catch (err) {
      console.error(err);
      setError("日記下書きの準備に失敗しました");
    } finally {
      setPostingDiary(false);
    }
  };

  const renderQuestionCard = (question: SelfEsteemQuestion) => (
    <div key={question.id} className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-sm">
      <p className="text-sm font-semibold text-tape-brown">
        {question.category} / {question.id}
      </p>
      <p className="mt-2 text-lg text-tape-dark-brown">{question.text}</p>
      <div className="mt-4 grid gap-2 md:grid-cols-5">
        {ANSWER_OPTIONS.map((option) => {
          const checked = answers[question.id] === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer flex-col items-center rounded-xl border p-2 text-center text-xs font-semibold transition-all ${
                checked ? "border-tape-pink bg-tape-pink/10 text-tape-pink" : "border-tape-beige text-tape-light-brown"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={option.value}
                checked={checked}
                onChange={() => handleAnswer(question.id, option.value)}
                className="hidden"
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  const renderResultSummary = () => {
    if (!result) return null;
    const comparisonLabel = result.previousDay && result.previousDay.date === yesterdayJst ? "昨日" : "前回";
    return (
      <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg">
        <p className="text-center text-sm font-semibold text-tape-light-brown">本日の自己肯定感</p>
        <p className="mt-3 text-center text-5xl font-bold text-tape-brown">
          {result.selfEsteemScore}
          <span className="text-lg font-medium"> / 100</span>
        </p>
        <p className="mt-3 text-center text-xs text-tape-light-brown">
          無価値感 {result.worthlessnessScore} 点
        </p>
        {result.comparison && result.previousDay && (
          <div className="mt-4 rounded-2xl bg-[#fff4f4] p-4 text-sm text-tape-brown">
            <p className="font-semibold">{comparisonLabel}({result.previousDay.date})との比較</p>
            <p className="mt-2 flex justify-between">
              <span>自己肯定感</span>
              <span className={result.comparison.selfEsteemDiff >= 0 ? "text-tape-green" : "text-tape-pink"}>
                {result.comparison.selfEsteemDiff >= 0 ? "+" : ""}
                {result.comparison.selfEsteemDiff}
              </span>
            </p>
            <p className="mt-1 flex justify-between">
              <span>無価値感</span>
              <span className={result.comparison.worthlessnessDiff <= 0 ? "text-tape-green" : "text-tape-pink"}>
                {result.comparison.worthlessnessDiff >= 0 ? "+" : ""}
                {result.comparison.worthlessnessDiff}
              </span>
            </p>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <Button variant="outline" className="flex-1" onClick={handleRetake} disabled={questionsLoading || postingDiary}>
            もう一度測る
          </Button>
          <Button className="flex-1 bg-tape-pink text-white" onClick={handleGoDiary} disabled={postingDiary}>
            {postingDiary ? "準備中..." : "この結果で日記を書く"}
          </Button>
        </div>
      </div>
    );
  };

  const renderBlockedState = () => (
    <div className="rounded-3xl border border-white/50 bg-white/90 p-8 text-center shadow-lg">
      <p className="text-lg font-semibold text-tape-brown">本日は日記投稿済みです</p>
      <p className="mt-2 text-sm text-tape-light-brown">新しい無価値感テストは明日の朝0:00（JST）に解放されます。</p>
      <Button className="mt-6 bg-tape-pink text-white" onClick={() => router.push("/diary")}>日記ページに戻る</Button>
    </div>
  );

  const showBlocked = status && !status.canTakeTest;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff7f1] via-[#fff] to-[#f7fbff] p-4 pb-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_18px_48px_rgba(81,67,60,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-tape-light-brown">
            DAILY SELF-ESTEEM
          </p>
          <h1 className="mt-2 text-2xl font-bold text-tape-dark-brown">今日の自己肯定感を計測する</h1>
          <p className="mt-2 text-sm text-tape-light-brown">
            6領域から毎日ネガティブな5問を抽出。1分で自己肯定感と無価値感の変化を把握し、日記にスコアを残せます。
          </p>
          {status?.lastScore != null && (
            <p className="mt-3 text-xs text-tape-brown">
              最新スコア: <span className="font-semibold">{status.lastScore}点</span>
            </p>
          )}
        </div>

        {status?.hasCompletedToday && !status?.hasPostedToday && (
          <div className="rounded-2xl border border-tape-pink/30 bg-white/90 p-4 text-sm text-tape-brown">
            <p className="font-semibold">計測済みのスコアがあります。</p>
            <p className="text-[13px] text-tape-light-brown">
              日記を投稿してグラフに反映すると、今日のテストはロックされます。投稿前ならいつでも再受験できます。
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {statusLoading && (
          <div className="rounded-3xl bg-white/80 p-8 text-center text-sm text-tape-light-brown">
            ステータスを読み込み中...
          </div>
        )}

        {!statusLoading && showBlocked && renderBlockedState()}

        {!statusLoading && !showBlocked && (
          <div className="space-y-6">
            {view === "questions" && (
              <>
                <div className="flex flex-col gap-3 rounded-2xl bg-white/80 p-4 text-sm text-tape-light-brown md:flex-row md:items-center md:justify-between">
                  <p>
                    現在の質問セット: <span className="font-semibold text-tape-brown">{questions.length > 0 ? `${questions.length}問` : "---"}</span>
                  </p>
                  <p>
                    回答済み: <span className="font-semibold text-tape-brown">{answeredCount} / 5</span>
                  </p>
                </div>
                {questionsLoading && (
                  <div className="rounded-2xl bg-white/80 p-6 text-center text-sm text-tape-light-brown">
                    問題セットを準備中...
                  </div>
                )}
                {!questionsLoading && (
                  <div className="space-y-4">
                    {questions.map(renderQuestionCard)}
                    <div className="flex flex-col gap-3 md:flex-row">
                      <Button
                        className="flex-1 bg-tape-pink text-white"
                        size="lg"
                        disabled={!allAnswered}
                        onClick={handleSubmit}
                      >
                        5問を送信して計測する
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={loadQuestions}
                        disabled={questionsLoading}
                      >
                        別の質問に更新
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {view === "loading" && (
              <div className="rounded-3xl bg-white/90 p-10 text-center">
                <p className="text-sm font-semibold text-tape-light-brown">スコアを計算しています...</p>
                <div className="mx-auto mt-6 h-2 w-40 overflow-hidden rounded-full bg-tape-beige/60">
                  <div className="animate-pulse-progress h-full w-full origin-left bg-tape-pink"></div>
                </div>
              </div>
            )}

            {view === "result" && renderResultSummary()}
          </div>
        )}
      </div>
    </div>
  );
};

// Tailwind animation utility
declare global {
  interface CSSStyleDeclaration {
    "--progress"?: string;
  }
}
