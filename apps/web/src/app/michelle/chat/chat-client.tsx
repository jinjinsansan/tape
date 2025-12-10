"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send, Trash2 } from "lucide-react";
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

export function MichelleChatClient() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setThinkingMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, THINKING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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
  };

  return (
    <div className="flex h-[calc(100vh-80px)] font-sans" style={{ fontFamily: 'sans-serif' }}>
      {/* サイドバー */}
      <aside className="hidden w-72 flex-col border-r md:flex" style={{ backgroundColor: '#fce4ec' }}>
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full rounded-lg bg-white px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ color: '#e91e63' }}
          >
            ＋ 新しいチャット
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-white/50 transition-colors",
                session.id === activeSessionId && "bg-white/70"
              )}
              onClick={() => loadMessages(session.id)}
            >
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
              <span className="flex-1 truncate text-gray-700">{session.title ?? "無題のセッション"}</span>
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
      <main className="flex flex-1 flex-col" style={{ backgroundColor: '#fce4ec' }}>
        <div className="flex-1 overflow-y-auto px-4 py-8">
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
                  <h2 className="text-2xl font-bold" style={{ color: '#e91e63' }}>
                    こんにちは、ミシェルです
                  </h2>
                  <p className="mt-2 text-sm text-gray-600">
                    心のモヤモヤ、誰にも言えない悩み、なんでも話してください。
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    私はあなたの親となって、一緒に答えを探します。
                  </p>
                </div>
              </div>

              {/* プリセットボタン */}
              <div className="grid w-full max-w-xl grid-cols-1 gap-3 px-4 sm:grid-cols-2">
                {PRESET_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    disabled={isLoading}
                    className="rounded-xl bg-white px-6 py-4 text-center text-sm text-gray-700 shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
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
                        ? "bg-white text-gray-800"
                        : "bg-pink-50 text-gray-800"
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  </div>
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
                  <div className="flex items-center gap-3 rounded-2xl bg-pink-50 px-5 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-pink-400 [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-pink-400 [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-pink-400" />
                    </div>
                    <p className="text-sm text-gray-600">{THINKING_MESSAGES[thinkingMessageIndex]}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 入力エリア */}
        <div className="border-t bg-white/50 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl">
            {error && (
              <p className="mb-2 text-xs font-medium text-red-500">{error}</p>
            )}
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="ミシェルに話しかける..."
                disabled={isLoading}
                className="flex-1 resize-none rounded-2xl border-0 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-pink-300 disabled:opacity-50"
                rows={1}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#ec407a' }}
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-5 w-5 text-white" style={{ marginLeft: '2px' }} />
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-gray-500">
              ミシェルAI機能は開発中の機能です
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
