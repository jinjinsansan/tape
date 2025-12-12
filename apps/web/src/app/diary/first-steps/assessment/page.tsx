"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, ChevronRight, Heart, RotateCcw } from "lucide-react";

import type { AssessmentPath, AssessmentQuestion, BranchJump } from "../assessment-data";
import { getQuestionsForPath } from "../assessment-data";

type AnswerLogEntry = {
  questionId: number;
  prompt: string;
  option?: string;
  inputValue?: number;
  points: number;
};

type SubmissionState = "idle" | "saving" | "success" | "error";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getInputPenalty = (value: number) => {
  if (value >= 0 && value <= 25) return 10;
  if (value >= 26 && value <= 50) return 4;
  if (value >= 51 && value <= 75) return 0;
  if (value >= 76 && value <= 100) return -2;
  return 0;
};

export default function SelfAssessmentPage() {
  const [score, setScore] = useState(100);
  const [currentPath, setCurrentPath] = useState<AssessmentPath>("teen");
  const [currentQuestionId, setCurrentQuestionId] = useState(1);
  const [started, setStarted] = useState(false);
  const [ageRestricted, setAgeRestricted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [answerLog, setAnswerLog] = useState<AnswerLogEntry[]>([]);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const questions = useMemo(() => getQuestionsForPath(currentPath), [currentPath]);
  const currentQuestion = useMemo<AssessmentQuestion | undefined>(() => {
    return questions.find((question) => question.id === currentQuestionId);
  }, [questions, currentQuestionId]);

  const worthlessnessScore = useMemo(() => clamp(100 - score, 0, 100), [score]);

  useEffect(() => {
    if (gameFinished && submissionState === "idle" && !ageRestricted) {
      void submitResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameFinished, submissionState, ageRestricted]);

  const resetAll = () => {
    setScore(100);
    setCurrentPath("teen");
    setCurrentQuestionId(1);
    setStarted(false);
    setAgeRestricted(false);
    setShowDisclaimer(false);
    setGameFinished(false);
    setInputValue("");
    setAnswerLog([]);
    setSubmissionState("idle");
    setSubmissionError(null);
  };

  const submitResults = useCallback(async () => {
    if (submissionState !== "idle") return;
    setSubmissionState("saving");
    setSubmissionError(null);

    try {
      const response = await fetch("/api/diary/self-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agePath: currentPath,
          selfEsteemScore: score,
          worthlessnessScore,
          answers: answerLog.map((entry) => ({
            questionId: entry.questionId,
            prompt: entry.prompt,
            option: entry.option ?? (entry.inputValue !== undefined ? `${entry.inputValue}` : ""),
            points: entry.points
          }))
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setSubmissionState("success");
    } catch (error) {
      console.error("Failed to save assessment", error);
      setSubmissionState("error");
      setSubmissionError("診断結果の保存に失敗しました。通信環境を確認して再度お試しください。");
    }
  }, [submissionState, currentPath, score, worthlessnessScore, answerLog]);

  const handleBranch = (jump?: BranchJump) => {
    if (!jump || jump === "end") {
      setGameFinished(true);
      return;
    }

    if (jump === "age_restriction") {
      setAgeRestricted(true);
      setStarted(false);
      return;
    }

    if (jump === "disclaimer") {
      setShowDisclaimer(true);
      return;
    }

    if (jump === "adult_path") {
      setCurrentPath("adult");
      setCurrentQuestionId(3);
      return;
    }

    if (jump === "teen_path") {
      setCurrentPath("teen");
      setCurrentQuestionId(3);
      return;
    }

    if (jump === "senior_path") {
      setCurrentPath("senior");
      setCurrentQuestionId(3);
      return;
    }

    if (typeof jump === "number") {
      setCurrentQuestionId(jump);
    }
  };

  const handleOptionSelect = (question: AssessmentQuestion, optionIndex: number) => {
    if (!question.options) return;
    const option = question.options[optionIndex];

    const newScore = clamp(score - option.points, 0, 100);
    setScore(newScore);
    setAnswerLog((prev) => [
      ...prev,
      {
        questionId: question.id,
        prompt: question.text,
        option: option.text,
        points: option.points
      }
    ]);

    handleBranch(option.nextQuestion ?? question.nextQuestion);
  };

  const handleInputSubmit = () => {
    if (!currentQuestion || currentQuestion.type !== "input") return;
    const numericValue = Number(inputValue);
    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
      alert("0〜100の数字で入力してください");
      return;
    }

    const penalty = getInputPenalty(numericValue);
    const newScore = clamp(score - penalty, 0, 100);
    setScore(newScore);
    setAnswerLog((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        prompt: currentQuestion.text,
        inputValue: numericValue,
        points: penalty
      }
    ]);

    setInputValue("");
    handleBranch(currentQuestion.nextQuestion);
  };

  const proceedToResults = () => {
    setShowDisclaimer(false);
    setGameFinished(true);
  };

  const resultBadge = useMemo(() => {
    if (score >= 80) {
      return {
        label: "晴れやかな光",
        description: "自分らしさをしっかり感じ取れています。日記でさらに磨いていきましょう。",
        color: "bg-tape-green/10 text-tape-green"
      };
    }
    if (score >= 60) {
      return {
        label: "穏やかな午後",
        description: "揺れながらも自分を整える力があります。丁寧な振り返りが効果的です。",
        color: "bg-tape-beige/60 text-tape-brown"
      };
    }
    if (score >= 40) {
      return {
        label: "曇り空のなかの光",
        description: "エネルギーが減りやすい状態。無価値感を下げる日記ワークを取り入れましょう。",
        color: "bg-tape-orange/10 text-tape-orange"
      };
    }
    return {
      label: "夜明け前",
      description: "サポートが必要なタイミングです。かんじょうにっきで安全な場所をつくりましょう。",
      color: "bg-tape-pink/10 text-tape-pink"
    };
  }, [score]);

  const renderIntro = () => (
    <div className="min-h-screen bg-tape-cream px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href="/diary/first-steps" className="text-sm text-tape-light-brown hover:text-tape-brown">
          ← 最初にやることへ戻る
        </Link>
        <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-tape-beige/60 space-y-6">
          <p className="text-xs font-semibold text-tape-pink tracking-[0.2em]">SELF ESTEEM CHECK</p>
          <h1 className="text-3xl font-bold text-tape-brown">自己肯定感スコア診断</h1>
          <p className="text-sm text-tape-light-brown leading-relaxed">
            質問に答えて、今の自己肯定感スコア（0〜100）と無価値感スコアを計測します。結果は自動で保存され、
            かんじょうにっきのグラフや最初にやることの記録に反映されます。
          </p>
          <div className="rounded-2xl bg-tape-cream/70 p-4 text-sm text-tape-brown space-y-2">
            <p>・所要時間は約3分です。</p>
            <p>・途中で離脱した場合は再度最初からやり直せます。</p>
            <p>・点数は誰かと比較するものではなく、あなた自身の変化を知るために使います。</p>
          </div>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="inline-flex items-center justify-center rounded-full bg-tape-brown px-6 py-3 text-sm font-semibold text-white hover:bg-tape-brown/90"
          >
            診断をはじめる
            <ChevronRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderAgeRestriction = () => (
    <div className="min-h-screen bg-tape-cream px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-lg ring-1 ring-tape-beige/60">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-tape-pink/10">
          <Heart className="h-10 w-10 text-tape-pink" />
        </div>
        <h2 className="text-2xl font-semibold text-tape-brown">ごめんなさい</h2>
        <p className="mt-4 text-sm text-tape-light-brown leading-relaxed">
          この診断は10歳以上向けに作成されています。成長に合わせてまた遊びに来てください。
        </p>
        <button
          type="button"
          onClick={resetAll}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-tape-brown px-5 py-2 text-sm font-semibold text-white"
        >
          最初に戻る
        </button>
      </div>
    </div>
  );

  const renderDisclaimer = () => (
    <div className="min-h-screen bg-tape-cream px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-8 rounded-3xl bg-white p-8 shadow-lg ring-1 ring-tape-beige/60">
        <p className="text-xs font-semibold text-tape-pink tracking-[0.2em]">NOTE</p>
        <h2 className="text-2xl font-bold text-tape-brown">結果を見る前に</h2>
        <div className="space-y-4 text-sm text-tape-brown leading-relaxed">
          <p>自己肯定感スコアは、あなたの感情を丁寧に観察するための目印です。誰かと比較するものではありません。</p>
          <p>数値が低くても、無価値感スコアを少しずつ下げていくことで変化を感じられるようになります。</p>
          <p>深呼吸をして、いまの自分を優しく受け止めてから結果ページに進みましょう。</p>
        </div>
        <button
          type="button"
          onClick={proceedToResults}
          className="inline-flex w-full items-center justify-center rounded-full bg-tape-brown px-6 py-3 text-sm font-semibold text-white hover:bg-tape-brown/90"
        >
          理解しました。結果を見る
          <ChevronRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="min-h-screen bg-tape-cream px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href="/diary/first-steps" className="text-sm text-tape-light-brown hover:text-tape-brown">
          ← 最初にやることへ戻る
        </Link>
        <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-tape-beige/60 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-tape-pink tracking-[0.25em]">RESULT</p>
              <h1 className="mt-2 text-3xl font-bold text-tape-brown">診断結果</h1>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tape-cream">
              <Award className="h-8 w-8 text-tape-brown" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-tape-beige bg-tape-green/5 p-4">
              <p className="text-xs font-semibold text-tape-light-brown">自己肯定感スコア</p>
              <p className="text-4xl font-bold text-tape-brown">{score} 点</p>
            </div>
            <div className="rounded-2xl border border-tape-beige bg-tape-pink/5 p-4">
              <p className="text-xs font-semibold text-tape-light-brown">無価値感スコア</p>
              <p className="text-4xl font-bold text-tape-brown">{worthlessnessScore} 点</p>
            </div>
          </div>
          <div className={`rounded-2xl p-4 text-sm ${resultBadge.color}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.25em]">CURRENT MODE</p>
            <p className="mt-1 text-lg font-semibold">{resultBadge.label}</p>
            <p className="mt-2 leading-relaxed">{resultBadge.description}</p>
          </div>
          <div className="rounded-2xl border border-dashed border-tape-beige p-4 text-sm text-tape-brown">
            <p>診断結果は「最初にやること」と「無価値感の推移」ページに保存されました。</p>
            {submissionState === "saving" && <p className="mt-2 text-tape-light-brown">保存中...</p>}
            {submissionState === "success" && <p className="mt-2 text-tape-green">保存が完了しました。</p>}
            {submissionState === "error" && (
              <p className="mt-2 text-tape-pink">
                {submissionError ?? "保存に失敗しました。時間をおいて再度お試しください。"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/diary/first-steps"
              className="inline-flex items-center justify-center rounded-full bg-tape-brown px-6 py-3 text-sm font-semibold text-white hover:bg-tape-brown/90"
            >
              記録に戻る
            </Link>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center justify-center rounded-full border border-tape-beige px-6 py-3 text-sm font-semibold text-tape-brown hover:bg-white"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> もう一度診断する
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuestion = () => (
    <div className="min-h-screen bg-tape-cream px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-lg ring-1 ring-tape-beige/60">
        <div className="mb-6 flex items-center justify-between text-sm text-tape-light-brown">
          <span>質問 {currentQuestion?.id}</span>
          <span>スコア {score} / 100</span>
        </div>
        <h2 className="text-xl font-semibold text-tape-brown leading-relaxed">{currentQuestion?.text}</h2>
        {currentQuestion?.type === "input" ? (
          <div className="mt-6 space-y-4">
            <input
              type="number"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              min={0}
              max={100}
              placeholder="0〜100"
              className="w-full rounded-2xl border border-tape-beige px-4 py-3 text-center text-2xl font-semibold text-tape-brown focus:border-tape-pink focus:outline-none"
            />
            <button
              type="button"
              onClick={handleInputSubmit}
              className="w-full rounded-full bg-tape-brown px-4 py-3 text-sm font-semibold text-white"
            >
              回答する
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {currentQuestion?.options?.map((option, index) => (
              <button
                key={option.text}
                type="button"
                onClick={() => handleOptionSelect(currentQuestion, index)}
                className="w-full rounded-2xl border border-tape-beige bg-tape-cream/60 px-4 py-3 text-left text-sm text-tape-brown transition hover:bg-white"
              >
                {option.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (!started) {
    return renderIntro();
  }

  if (ageRestricted) {
    return renderAgeRestriction();
  }

  if (showDisclaimer) {
    return renderDisclaimer();
  }

  if (gameFinished) {
    return renderResult();
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-tape-cream px-4 py-10">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-lg ring-1 ring-tape-beige/60">
          <p className="text-sm text-tape-brown">質問を準備中です。</p>
          <button
            type="button"
            onClick={resetAll}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-tape-brown px-5 py-2 text-sm font-semibold text-white"
          >
            最初に戻る
          </button>
        </div>
      </div>
    );
  }

  return renderQuestion();
}
