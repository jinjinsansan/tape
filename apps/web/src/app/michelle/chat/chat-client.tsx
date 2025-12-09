"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Send, Trash2, PlusCircle, MessageSquare } from "lucide-react";

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

export function MichelleChatClient() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSend = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setError(null);

    const payload = {
      sessionId: activeSessionId ?? undefined,
      message: input.trim()
    };

    const optimisticUserMessage: MessageItem = {
      id: crypto.randomUUID(),
      role: "user",
      content: payload.message,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInput("");

    const res = await fetch("/api/michelle/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-buffered-response": "1"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      setIsLoading(false);
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

    setIsLoading(false);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-5xl gap-6 px-4 py-6">
      <aside className="hidden w-64 flex-shrink-0 flex-col rounded-3xl border border-tape-beige bg-white p-4 shadow-sm md:flex">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-tape-brown">会話履歴</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setActiveSessionId(null);
              setMessages([]);
            }}
            title="新規チャット"
          >
            <PlusCircle className="h-5 w-5 text-tape-green" />
          </Button>
        </div>
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-2">
          {sessions.length === 0 && <p className="text-xs text-tape-light-brown">まだ会話はありません</p>}
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => loadMessages(session.id)}
              className={cn(
                "group relative w-full cursor-pointer rounded-2xl border px-3 py-3 text-left text-sm transition-all",
                session.id === activeSessionId
                  ? "border-tape-green/50 bg-tape-green/10"
                  : "border-transparent bg-tape-cream hover:bg-tape-beige"
              )}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className={cn("mt-0.5 h-4 w-4 shrink-0", session.id === activeSessionId ? "text-tape-green" : "text-tape-light-brown")} />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-medium text-tape-brown">{session.title ?? "無題のセッション"}</p>
                  <p className="mt-1 text-[10px] text-tape-light-brown">
                    {new Date(session.updated_at).toLocaleString("ja-JP")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteSession(session.id);
                }}
                className="absolute right-2 top-2 hidden text-tape-light-brown hover:text-tape-pink group-hover:block"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex flex-1 flex-col rounded-3xl border border-tape-beige bg-white shadow-sm">
        <header className="border-b border-tape-beige px-6 py-4 bg-tape-cream/30 rounded-t-3xl">
          <p className="text-sm font-bold text-tape-brown">ミシェルAIカウンセリング</p>
          <p className="text-xs text-tape-light-brown">Tape式心理学の知識を元に回答します</p>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <p className="text-lg font-bold text-tape-brown">こんにちは</p>
                <p className="text-sm text-tape-light-brown">今日のお気持ちをお聞かせください。</p>
              </div>
            </div>
          )}
          {messages.map((message) => (
            <article
              key={message.id}
              className={cn(
                "flex w-full flex-col gap-1",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              <p className="ml-1 text-[10px] font-semibold text-tape-light-brown">
                {message.role === "assistant" ? "Michelle" : "You"}
              </p>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm",
                  message.role === "assistant"
                    ? "bg-white border border-tape-beige text-tape-brown"
                    : "bg-tape-orange text-white"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </article>
          ))}
        </div>

        <footer className="border-t border-tape-beige p-4 bg-tape-cream/30 rounded-b-3xl">
          {error && <p className="mb-2 text-xs text-tape-pink font-semibold">{error}</p>}
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="ここに入力..."
              className="h-14 flex-1 resize-none rounded-2xl border border-tape-beige bg-white px-4 py-4 text-sm text-tape-brown outline-none focus:border-tape-green focus:ring-1 focus:ring-tape-green"
            />
            <Button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="h-14 w-14 rounded-full bg-tape-green text-tape-brown hover:bg-tape-green/90 p-0 flex items-center justify-center"
            >
              {isLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-tape-brown border-t-transparent"/>
              ) : (
                <Send className="h-5 w-5 ml-0.5" />
              )}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}
