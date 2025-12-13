"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send, Trash2, Menu, X, User, Loader2 } from "lucide-react";
import Image from "next/image";

type SessionSummary = {
  id: string;
  title: string | null;
  category: string;
  updated_at: string;
};

type MessageItem = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

type GuidedAction = "back" | "deeper" | "next";
type GuidedPhase = "explore" | "deepen" | "release";

const PRESET_PROMPTS = [
  "会社の上司に怒られた...",
  "最近なんだか寂しい",
  "1年ぐらい付き合ってない",
  "彼女がなかなか寝ない"
];

const THINKING_MESSAGES = [
  "心の声を聞いています...",
  "感情を整理しています...",
  "思考を整えています...",
  "寄り添いながら考えています..."
];

const THINKING_INTERVAL_MS = 1400;

const GUIDED_ACTION_PRESETS: Record<GuidedAction, { prompt: string; success: string }> = {
  back: {
    prompt: "直前に扱っていたテーマをもう一度整理したいです。さっきの内容を別の視点でもう少し丁寧に解説してください。",
    success: "✓ 直前のテーマをもう一度整理します",
  },
  deeper: {
    prompt:
      "今取り組んでいる心のテーマをさらに深掘りしたいです。感情の芯や根底にある思い込みまで一緒に探ってください。",
    success: "✓ 同じテーマをさらに深掘りします",
  },
  next: {
    prompt: "このテーマはいったん区切って、次に進むためのセルフケアや新しい視点を案内してください。",
    success: "✓ 次のステップへ進みます",
  },
};

const GUIDED_PHASE_LABELS: Record<GuidedPhase, string> = {
  explore: "気持ちの整理",
  deepen: "深掘り・核心探索",
  release: "リリース＆ケア",
};

const GUIDED_PHASE_DESCRIPTIONS: Record<GuidedPhase, string> = {
  explore: "今感じている感情やテーマを整理しています",
  deepen: "感情の芯や思い込みを深掘り中",
  release: "感情のリリースとセルフケアへ移行中",
};

export function MichelleChatClient() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<GuidedPhase>("explore");
  const [phaseInsight, setPhaseInsight] = useState<{ phase: GuidedPhase; summary: string } | null>(null);
  const [isPhaseInsightLoading, setIsPhaseInsightLoading] = useState(false);
  const [guidedActionLoading, setGuidedActionLoading] = useState<null | GuidedAction>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  const initialMobileBlurApplied = useRef(false);

  const loadSessions = async () => {
    const res = await fetch("/api/michelle/sessions", { cache: "no-store" });
    if (res.status === 401) {
      setError("ログインすると利用できます。");
      return;
    }
    if (!res.ok) {
      setError("セッション一覧の取得に失敗しました");
      return;
    }
    const data = (await res.json()) as { sessions: SessionSummary[] };
    setSessions(data.sessions ?? []);
  };

  const loadMessages = async (sessionId: string) => {
    const res = await fetch(`/api/michelle/sessions/${sessionId}/messages`, { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 401) {
        setError("ログインセッションが切れています。再度ログインしてください。");
        return;
      }
      setError("メッセージの取得に失敗しました");
      return;
    }
    const data = (await res.json()) as { session: SessionSummary; messages: MessageItem[] };
    setMessages(data.messages ?? []);
    setActiveSessionId(data.session.id);
  };

  useEffect(() => {
    loadSessions();

    const updateViewportMetrics = () => {
      const isMobileLayout = window.innerWidth < 768;
      setIsMobile(isMobileLayout);
      const dynamicHeight = window.visualViewport?.height ?? window.innerHeight;
      setViewportHeight(dynamicHeight);
    };

    updateViewportMetrics();

    if (!initialMobileBlurApplied.current && window.innerWidth < 768 && textareaRef.current) {
      textareaRef.current.blur();
      initialMobileBlurApplied.current = true;
    }

    window.addEventListener("resize", updateViewportMetrics);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", updateViewportMetrics);

    return () => {
      window.removeEventListener("resize", updateViewportMetrics);
      visualViewport?.removeEventListener("resize", updateViewportMetrics);
    };
  }, []);

  useEffect(() => {
    const composerElement = composerRef.current;
    if (!composerElement) {
      return;
    }

    const updateComposerHeight = () => {
      if (composerRef.current) {
        setComposerHeight(composerRef.current.offsetHeight);
      }
    };

    updateComposerHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateComposerHeight);
      return () => window.removeEventListener("resize", updateComposerHeight);
    }

    const observer = new ResizeObserver(updateComposerHeight);
    observer.observe(composerElement);

    return () => {
      observer.disconnect();
    };
  }, [composerRef]);

  useEffect(() => {
    if (composerRef.current) {
      setComposerHeight(composerRef.current.offsetHeight);
    }
  }, [error, input, isMobile]);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setThinkingMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, THINKING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, composerHeight]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm("このセッションを削除しますか？");
    if (!confirmed) return;
    const res = await fetch(`/api/michelle/sessions/${sessionId}`, { method: "DELETE" });
    if (!res.ok) {
      alert("削除に失敗しました");
      return;
    }
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
    }
  };

  const handleSend = async (message?: string) => {
    const textToSend = message || input.trim();
    if (!textToSend) return;
    
    // モバイルでは送信後にキーボードを閉じる
    if (isMobile && textareaRef.current) {
      textareaRef.current.blur();
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      sessionId: activeSessionId ?? undefined,
      message: textToSend,
      category: !activeSessionId ? "life" : undefined
    };

    const optimisticUserMessage: MessageItem = {
      id: crypto.randomUUID(),
      role: "user",
      content: textToSend,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInput("");

    try {
      const res = await fetch("/api/michelle/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-buffered-response": "1"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMessage.id));
        setError("AI 応答の取得に失敗しました");
        return;
      }

      const data = (await res.json()) as { sessionId: string; message: string };
      setActiveSessionId(data.sessionId);
      await loadSessions();

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMessage.id));
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
    setPhaseInsight(null);
    setCurrentPhase("explore");
  };

  const handlePhaseInsightRequest = async () => {
    if (!activeSessionId || messages.length < 4) {
      setError("会話が十分ではありません");
      setTimeout(() => setError(null), 2000);
      return;
    }

    setIsPhaseInsightLoading(true);
    try {
      const res = await fetch("/api/michelle/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId }),
      });

      if (res.status === 401) {
        setError("ログインが必要です");
        setTimeout(() => setError(null), 2000);
        return;
      }

      if (!res.ok) {
        let serverMessage = "フェーズ診断に失敗しました";
        try {
          const errorBody = (await res.json()) as { error?: string };
          if (errorBody?.error) {
            serverMessage = errorBody.error;
          }
        } catch {}
        throw new Error(serverMessage);
      }

      const data = (await res.json()) as { phase?: string; summary?: string };
      const allowedPhases: GuidedPhase[] = ["explore", "deepen", "release"];
      const normalized = (data.phase ?? "explore").toLowerCase() as GuidedPhase;
      const nextPhase = allowedPhases.includes(normalized) ? normalized : "explore";

      setCurrentPhase(nextPhase);
      setPhaseInsight({
        phase: nextPhase,
        summary: data.summary?.trim() || `現在は${GUIDED_PHASE_LABELS[nextPhase]}にいます。`,
      });
    } catch (phaseError) {
      const message = phaseError instanceof Error ? phaseError.message : "フェーズ診断に失敗しました";
      setError(message);
      setTimeout(() => setError(null), 2000);
    } finally {
      setIsPhaseInsightLoading(false);
    }
  };

  const handleGuidedAction = async (action: GuidedAction) => {
    if (isLoading || guidedActionLoading) {
      return;
    }

    const preset = GUIDED_ACTION_PRESETS[action];
    setGuidedActionLoading(action);

    try {
      setError(preset.success);
      setTimeout(() => setError(null), 2000);

      await handleSend(preset.prompt);
    } catch (actionError) {
      console.error("Guided action error", actionError);
      setError("操作に失敗しました");
      setTimeout(() => setError(null), 2000);
    } finally {
      setGuidedActionLoading(null);
    }
  };

  const messagePaddingBottom = messages.length === 0 ? 0 : Math.max(composerHeight + 24, isMobile ? 160 : 96);
  const mobileViewportStyle = !isMobile || !viewportHeight ? undefined : { minHeight: `${viewportHeight}px`, height: `${viewportHeight}px` };

  return (
    <div className="flex min-h-[100dvh] font-sans md:h-[calc(100vh-80px)]" style={mobileViewportStyle}>
      {/* オーバーレイ（モバイルのみ） */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* サイドバー */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-tape-brown/20 bg-tape-cream transition-transform duration-300 md:static md:z-0 md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-tape-beige p-4">
          <button
            onClick={handleNewChat}
            className="flex-1 rounded-lg bg-white px-4 py-3 text-left text-sm font-medium text-tape-pink transition-colors hover:bg-tape-beige"
          >
            ＋ 新しいチャット
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-tape-brown hover:bg-tape-beige md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-white/50 transition-colors",
                session.id === activeSessionId && "bg-white"
              )}
              onClick={() => loadMessages(session.id)}
            >
              <input type="checkbox" className="h-4 w-4 rounded border-tape-beige" />
              <span className="flex-1 truncate text-tape-brown">{session.title ?? "無題のセッション"}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSession(session.id);
                }}
                className="hidden text-gray-400 hover:text-red-500 group-hover:block"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* メインエリア */}
      <main className="flex flex-1 flex-col bg-tape-cream overflow-hidden">
        {/* モバイルヘッダー */}
        <div className="flex items-center gap-3 border-b border-tape-beige bg-white/80 px-4 py-3 md:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-tape-brown hover:bg-tape-beige"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-tape-brown">ミシェルAI</p>
          </div>
          <div className="h-10 w-10" /> {/* スペーサー */}
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 py-8"
          style={{
            WebkitOverflowScrolling: "touch",
            paddingBottom: `${messagePaddingBottom}px`,
            overscrollBehavior: "contain"
          }}
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-8">
              {/* ミシェルアイコンと挨拶 */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-32 w-32 overflow-hidden rounded-full bg-white shadow-lg">
                  <Image
                    src="/michelle-icon.png"
                    alt="Michelle"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-tape-pink">
                    こんにちは、ミシェルです
                  </h2>
                  <p className="mt-2 text-sm text-tape-light-brown">
                    心のモヤモヤ、誰にも言えない悩み、なんでも話してください。
                  </p>
                  <p className="mt-1 text-sm text-tape-light-brown">
                    私はあなたの親となって、一緒に答えを探します。
                  </p>
                </div>
              </div>

              {/* プリセットボタン */}
              <div className="grid w-full max-w-xl grid-cols-2 gap-3 px-4 md:grid-cols-4">
                {PRESET_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    disabled={isLoading}
                    className="rounded-xl border border-tape-beige bg-white px-6 py-4 text-center text-sm text-tape-brown shadow-sm transition-all hover:bg-tape-beige hover:shadow-md disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message, index) => (
                <div key={message.id}>
                  <div
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-white shadow">
                        <Image
                          src="/michelle-icon.png"
                          alt="Michelle"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-5 py-3 shadow-sm",
                        message.role === "user"
                          ? "bg-tape-orange text-white"
                          : "bg-white border border-tape-beige text-tape-brown"
                      )}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    </div>
                    {message.role === "user" && (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-tape-brown shadow">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* AIメッセージの下にガイドボタンを表示 */}
                  {message.role === "assistant" && activeSessionId && messages.length >= 4 && (
                    <div className="ml-[52px] mt-1.5 flex flex-wrap items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[9px] text-[#b23462] hover:bg-[#ffe6ef]"
                        onClick={() => handleGuidedAction("back")}
                        disabled={guidedActionLoading !== null || isLoading}
                      >
                        {guidedActionLoading === "back" ? "整理中..." : "◀ 前のテーマ"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[9px] text-[#b23462] hover:bg-[#ffe6ef]"
                        onClick={() => handleGuidedAction("deeper")}
                        disabled={guidedActionLoading !== null || isLoading}
                      >
                        {guidedActionLoading === "deeper" ? "準備中..." : "◎ 深掘り"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[9px] text-[#b23462] hover:bg-[#ffe6ef]"
                        onClick={() => handleGuidedAction("next")}
                        disabled={guidedActionLoading !== null || isLoading}
                      >
                        {guidedActionLoading === "next" ? "案内中..." : "次へ ▶"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[9px] text-[#b23462] hover:bg-[#ffe6ef]"
                        onClick={handlePhaseInsightRequest}
                        disabled={isPhaseInsightLoading || !activeSessionId}
                      >
                        {isPhaseInsightLoading && <Loader2 className="mr-0.5 h-2.5 w-2.5 animate-spin" />}
                        {isPhaseInsightLoading ? "判定中..." : "フェーズ判定"}
                      </Button>
                      {phaseInsight && (
                        <span className="text-[9px] text-[#b1637d]">
                          {GUIDED_PHASE_LABELS[phaseInsight.phase]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-white shadow">
                    <Image
                      src="/michelle-icon.png"
                      alt="Michelle"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-tape-beige bg-white px-5 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-tape-green [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-tape-green [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-tape-green" />
                    </div>
                    <p className="text-sm text-tape-light-brown">{THINKING_MESSAGES[thinkingMessageIndex]}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 入力エリア */}
        <div
          ref={composerRef}
          className="sticky bottom-0 left-0 right-0 border-t border-tape-beige/80 bg-white/95 px-4 pt-3 pb-4 shadow-[0_-6px_24px_rgba(87,60,46,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/85"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <div className="mx-auto max-w-3xl">
            {error && (
              <p className="mb-2 text-xs font-medium text-tape-pink">{error}</p>
            )}
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                onFocus={(event) => {
                  if (isMobile) {
                    setTimeout(() => {
                      event.target.scrollIntoView({ behavior: "smooth", block: "center" });
                      scrollContainerRef.current?.scrollTo({
                        top: scrollContainerRef.current.scrollHeight,
                        behavior: "smooth"
                      });
                    }, 250);
                  }
                }}
                placeholder="ミシェルに話しかける..."
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                disabled={isLoading}
                className="max-h-40 flex-1 resize-none rounded-2xl border border-tape-beige bg-white px-4 py-3 text-base leading-relaxed text-tape-brown shadow-sm outline-none focus:border-tape-green focus:ring-2 focus:ring-tape-green/20 disabled:opacity-50 md:text-sm"
                rows={1}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-tape-pink text-white shadow-md transition-all hover:bg-tape-pink/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-5 w-5" style={{ marginLeft: '2px' }} />
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-tape-light-brown">
              ミシェルAIは誤った情報を生成する場合があります。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
