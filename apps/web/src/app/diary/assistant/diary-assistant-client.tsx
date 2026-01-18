"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MessageCircle, PenLine, Shield, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { MichelleAvatar } from "@/components/michelle/avatar";
import { Button } from "@/components/ui/button";
import { EMOTION_OPTIONS, EMOTIONS_REQUIRING_SCORE } from "@/constants/emotions";
import type { SelfEsteemQuestion } from "@/lib/self-esteem/types";
import type { AssistantDraftPayload } from "@/server/services/diary-ai-assistant";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "michelle" | "user";
  content: string;
};

type Step =
  | "intro"
  | "event"
  | "detail"
  | "emotion"
  | "score"
  | "test"
  | "preview";

const emotionBadgeClass = (selected: boolean) =>
  cn(
    "rounded-2xl border px-4 py-3 text-left text-sm transition",
    selected ? "border-rose-300 bg-rose-50" : "border-white/60 bg-white hover:border-rose-200"
  );

const conversationBubbleClass = (role: Message["role"]) =>
  cn(
    "rounded-2xl px-4 py-3 text-sm shadow-sm",
    role === "michelle"
      ? "bg-white text-slate-700 border border-pink-100"
      : "bg-[#fef2f7] text-[#5c4b43] border border-[#f8dce6]"
  );

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const DiaryAssistantTestStep = dynamic(
  () => import("./diary-assistant-test-step").then((mod) => mod.DiaryAssistantTestStep),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-sm text-[#7a6156]">
          テストを準備しています…
        </div>
      </div>
    )
  }
);

const DiaryAssistantPreview = dynamic(
  () => import("./diary-assistant-preview").then((mod) => mod.DiaryAssistantPreview),
  {
    loading: () => (
      <div className="flex items-center justify-center rounded-3xl border border-dashed border-rose-200 p-6 text-sm text-[#7a6358]">
        下書きを読み込んでいます…
      </div>
    )
  }
);

export function DiaryAssistantClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [emotion, setEmotion] = useState<string | null>(null);
  const [requiresScore, setRequiresScore] = useState(false);
  const [selfEsteemScore, setSelfEsteemScore] = useState<number | null>(null);
  const [worthlessnessScore, setWorthlessnessScore] = useState<number | null>(null);
  const [selfEsteemTestDate, setSelfEsteemTestDate] = useState<string | null>(null);
  const [testQuestions, setTestQuestions] = useState<SelfEsteemQuestion[] | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<AssistantDraftPayload | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<{ start?: boolean; send?: boolean; draft?: boolean; save?: boolean; test?: boolean }>(
    {}
  );
  const [isMobile, setIsMobile] = useState(false);
  const inputAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(window.innerWidth < 768);
    };

    updateMobileState();
    window.addEventListener("resize", updateMobileState);
    return () => window.removeEventListener("resize", updateMobileState);
  }, []);

  const scrollInputIntoView = useCallback((element: HTMLTextAreaElement | null) => {
    if (!isMobile || !element) {
      return;
    }
    setTimeout(() => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  }, [isMobile]);

  const callAssistant = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/diary/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "assistant_error");
    }
    return res.json() as Promise<Record<string, unknown>>;
  }, []);

  const handleStart = async () => {
    setLoading((prev) => ({ ...prev, start: true }));
    setError(null);
    try {
      const result = await callAssistant({ action: "start" });
      const id = result.sessionId as string;
      const question = (result.question as string) ?? "今日のことを教えてください";
      setSessionId(id);
      setMessages([
        {
          id: generateId(),
          role: "michelle",
          content: question
        }
      ]);
      setStep("event");
      setStatus("できごとを教えてください");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading((prev) => ({ ...prev, start: false }));
    }
  };

  const handleSend = async () => {
    if (!sessionId || !input.trim()) {
      return;
    }
    const content = input.trim();
    setInput("");
    addMessage({ id: generateId(), role: "user", content });
    setLoading((prev) => ({ ...prev, send: true }));
    setError(null);

    try {
      const result = await callAssistant({
        action: "answer",
        sessionId,
        step,
        message: content
      });
      if (result.question) {
        addMessage({
          id: generateId(),
          role: "michelle",
          content: result.question as string
        });
      }

      if (result.step === "detail") {
        setStep("detail");
        setStatus("もう少し詳しく");
      } else {
        setStep("emotion");
        setStatus("感情を選びましょう");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading((prev) => ({ ...prev, send: false }));
    }
  };

  const handleEmotionSelect = async (label: string) => {
    if (!sessionId) return;
    setEmotion(label);
    setError(null);
    try {
      const result = await callAssistant({ action: "emotion", sessionId, emotion: label });
      const needsScore = Boolean(result.requiresScore);
      setRequiresScore(needsScore);
      if (needsScore) {
        setStep("score");
        setStatus("自己肯定感スコアを入力してください");
      } else {
        await generateDraftPreview(sessionId);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleManualScoreSubmit = async () => {
    if (!sessionId || selfEsteemScore == null) {
      setError("スコアを入力してください");
      return;
    }
    setError(null);
    setLoading((prev) => ({ ...prev, send: true }));
    try {
      const result = await callAssistant({
        action: "self_esteem_value",
        sessionId,
        score: selfEsteemScore
      });
      setSelfEsteemScore(result.selfEsteemScore as number);
      setWorthlessnessScore(result.worthlessnessScore as number);
      setSelfEsteemTestDate((result.testDate as string) ?? null);
      await generateDraftPreview(sessionId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading((prev) => ({ ...prev, send: false }));
    }
  };

  const startSelfEsteemTest = async () => {
    if (!sessionId) return;
    setError(null);
    setLoading((prev) => ({ ...prev, test: true }));
    try {
      const result = await callAssistant({ action: "self_esteem_questions", sessionId });
      setTestQuestions(result.questions as SelfEsteemQuestion[]);
      setSelfEsteemTestDate((result.testDate as string) ?? null);
      setStep("test");
      setStatus("自己肯定感テスト");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading((prev) => ({ ...prev, test: false }));
    }
  };

  const handleSubmitTestAnswers = async () => {
    if (!sessionId || !testQuestions) return;
    const answers = testQuestions.map((question) => ({
      questionId: question.id,
      value: Number(testAnswers[question.id] ?? 0)
    }));

    if (answers.some((answer) => answer.value < 1 || answer.value > 5)) {
      setError("すべての設問に回答してください");
      return;
    }

    setLoading((prev) => ({ ...prev, test: true }));
    setError(null);
    try {
      const result = await callAssistant({ action: "self_esteem_submit", sessionId, answers });
      setSelfEsteemScore(result.selfEsteemScore as number);
      setWorthlessnessScore(result.worthlessnessScore as number);
      await generateDraftPreview(sessionId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading((prev) => ({ ...prev, test: false }));
    }
  };

  const generateDraftPreview = useCallback(
    async (id: string) => {
      setLoading((prev) => ({ ...prev, draft: true }));
      setError(null);
      try {
        const result = await callAssistant({ action: "generate_draft", sessionId: id });
        const payload = result.draft as AssistantDraftPayload;
        setDraft(payload);
        setStep("preview");
        setStatus("下書きができました");
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading((prev) => ({ ...prev, draft: false }));
      }
    },
    [callAssistant]
  );

  const handleSaveDraft = async () => {
    if (!sessionId) return;
    setError(null);
    setLoading((prev) => ({ ...prev, save: true }));
    try {
      const result = await callAssistant({ action: "save_draft", sessionId });
      const token = result.token as string;
      router.push(`/diary?draftToken=${token}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading((prev) => ({ ...prev, save: false }));
    }
  };

  const helperMessage = useMemo(() => {
    if (!emotion) return null;
    const option = EMOTION_OPTIONS.find((item) => item.label === emotion);
    return option?.description ?? null;
  }, [emotion]);

  const handleSelectTestAnswer = useCallback((questionId: string, value: number) => {
    setTestAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  }, []);

  const handleRegenerateDraft = useCallback(() => {
    if (!sessionId) {
      return;
    }
    void generateDraftPreview(sessionId);
  }, [generateDraftPreview, sessionId]);

  const renderIntro = () => (
    <div className="rounded-3xl border border-[#f5e6dd] bg-white/95 p-6 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <MichelleAvatar size="lg" variant="rose" className="mx-auto md:mx-0" />
        <div className="space-y-4 text-[#5a473f]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-400">MICHELLE</p>
            <h1 className="mt-1 text-3xl font-bold">日記補助AI</h1>
          </div>
          <p className="text-sm leading-relaxed">
            ミシェルが出来事・感情・自己肯定感スコアを整理し、日記の下書きをつくります。
            3ステップの会話で、日記投稿までのハードルを小さくしましょう。
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2"><MessageCircle className="mt-0.5 h-4 w-4 text-rose-400" />出来事と感情を一緒に振り返ります</li>
            <li className="flex items-start gap-2"><Shield className="mt-0.5 h-4 w-4 text-rose-400" />自己肯定感スコアも自動で連携</li>
            <li className="flex items-start gap-2"><PenLine className="mt-0.5 h-4 w-4 text-rose-400" />ボタンひとつで日記に下書き反映</li>
          </ul>
          <Button
            size="lg"
            className="mt-2 w-full rounded-full bg-tape-pink text-white shadow-md hover:bg-tape-pink/90 md:w-auto"
            onClick={handleStart}
            disabled={loading.start}
          >
            {loading.start ? <Loader2 className="h-4 w-4 animate-spin" /> : "ミシェルに相談をはじめる"}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderConversation = () => (
    <div className="space-y-4">
      {messages.map((message) => (
        <div key={message.id} className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}> 
          {message.role === "michelle" && <MichelleAvatar size="sm" className="mt-1" />}
          <div className={conversationBubbleClass(message.role)}>{message.content}</div>
        </div>
      ))}
      {(step === "event" || step === "detail") && (
        <div className="rounded-3xl border border-white bg-white/70 p-4 shadow-sm">
          <textarea
            ref={inputAreaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            placeholder="ここに気持ちを書き出してください"
            inputMode="text"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            onFocus={(event) => scrollInputIntoView(event.currentTarget)}
            className="w-full rounded-2xl border border-rose-100 bg-white p-3 text-base leading-relaxed focus:border-rose-300 focus:outline-none md:text-sm"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={handleSend} disabled={loading.send || !input.trim()} className="rounded-full bg-tape-pink text-white">
              {loading.send ? <Loader2 className="h-4 w-4 animate-spin" /> : "送信"}
            </Button>
          </div>
        </div>
      )}
      {loading.draft && (
        <div className="flex items-start gap-3">
          <MichelleAvatar size="sm" className="mt-1" />
          <div className="rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm text-[#6b574c] shadow-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
              <span>日記を整理しています…</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderEmotionStep = () => (
    <div className="space-y-3">
      <p className="text-sm text-[#6c554b]">いま一番強い感情を選んでください。</p>
      <div className="grid gap-3 md:grid-cols-2">
        {EMOTION_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            className={emotionBadgeClass(emotion === option.label)}
            onClick={() => handleEmotionSelect(option.label)}
          >
            <p className="font-semibold">{option.label}</p>
            <p className="text-xs text-slate-500">{option.description}</p>
            {EMOTIONS_REQUIRING_SCORE.has(option.label) && (
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-rose-500">
                <Sparkles className="h-3 w-3" /> 自己肯定感スコア対応
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderScoreStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-[#6c554b]">
        自己肯定感スコアは 1 〜 100 の数字です。分かる場合は入力、分からない場合は 5 問テストを受けましょう。
      </p>
      <div className="rounded-3xl border border-[#f5e6dd] bg-white p-4 shadow-sm">
        <label className="text-xs font-semibold text-[#a07d6d]">スコアを入力</label>
        <input
          type="number"
          min={1}
          max={100}
          value={selfEsteemScore ?? ""}
          onChange={(event) => setSelfEsteemScore(event.target.value ? Number(event.target.value) : null)}
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          autoComplete="off"
          className="mt-1 w-full rounded-2xl border border-rose-100 p-3 text-base md:text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" className="rounded-full bg-tape-pink text-white" onClick={handleManualScoreSubmit} disabled={loading.send}>
            {loading.send ? <Loader2 className="h-4 w-4 animate-spin" /> : "このスコアで進む"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={startSelfEsteemTest}
            disabled={loading.test}
          >
            {loading.test ? <Loader2 className="h-4 w-4 animate-spin" /> : "テストを受ける"}
          </Button>
        </div>
      </div>
    </div>
  );


  return (
    <div className="space-y-6">
      {step === "intro" && renderIntro()}
      {step !== "intro" && (
        <Fragment>
          <div className="rounded-3xl border border-[#f5e6dd] bg-white/70 p-5 shadow-sm">
            <div className="flex items-center gap-3 text-[#6b574c]">
              <Sparkles className="h-5 w-5 text-rose-400" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-400">STEP</p>
                <p className="text-lg font-bold">{status ?? "進行中"}</p>
              </div>
            </div>
          </div>
          {renderConversation()}
          {step === "emotion" && renderEmotionStep()}
          {step === "score" && renderScoreStep()}
          {step === "test" && (
            <DiaryAssistantTestStep
              questions={testQuestions}
              answers={testAnswers}
              onSelectAnswer={handleSelectTestAnswer}
              onSubmit={handleSubmitTestAnswers}
              submitting={loading.test}
            />
          )}
          {step === "preview" && (
            <DiaryAssistantPreview
              draft={draft}
              selfEsteemScore={selfEsteemScore}
              worthlessnessScore={worthlessnessScore}
              loadingDraft={loading.draft}
              loadingSave={loading.save}
              onSave={handleSaveDraft}
              onRegenerate={handleRegenerateDraft}
            />
          )}
          {helperMessage && step !== "preview" && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-xs text-[#7a6156]">
              {helperMessage}
            </div>
          )}
        </Fragment>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
