"use client";

import { useEffect, useState } from "react";

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
      <aside className="hidden w-64 flex-shrink-0 flex-col rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-lg shadow-slate-200/60 md:flex">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">会話履歴</p>
          <button
            type="button"
            className="text-xs font-semibold text-rose-500"
            onClick={() => {
              setActiveSessionId(null);
              setMessages([]);
            }}
          >
            新規
          </button>
        </div>
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
          {sessions.length === 0 && <p className="text-xs text-slate-400">まだ会話はありません</p>}
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => loadMessages(session.id)}
              className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                session.id === activeSessionId
                  ? "border-rose-200 bg-rose-50/80 text-rose-600"
                  : "border-slate-100 bg-white hover:border-rose-100"
              }`}
            >
              <p className="line-clamp-2 font-semibold">{session.title ?? "無題のセッション"}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {new Date(session.updated_at).toLocaleString("ja-JP")}
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteSession(session.id);
                }}
                className="mt-1 text-[10px] text-rose-400"
              >
                削除
              </button>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex flex-1 flex-col rounded-3xl border border-slate-100 bg-white/80 shadow-xl shadow-slate-200/50">
        <header className="border-b border-slate-100 px-6 py-4">
          <p className="text-sm font-semibold text-slate-600">ミシェルAIカウンセリング</p>
          <p className="text-xs text-slate-400">Tape式心理学の知識を元に回答します</p>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {messages.length === 0 && (
            <p className="text-sm text-slate-400">メッセージを送ると会話が始まります。</p>
          )}
          {messages.map((message) => (
            <article
              key={message.id}
              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                message.role === "assistant"
                  ? "bg-slate-50 text-slate-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide">
                {message.role === "assistant" ? "Michelle" : "You"}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
            </article>
          ))}
        </div>

        <footer className="border-t border-slate-100 px-6 py-4">
          {error && <p className="mb-2 text-xs text-rose-500">{error}</p>}
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="今感じていることを入力してください"
              className="h-24 flex-1 resize-none rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 outline-none focus:border-rose-200"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="h-24 w-28 rounded-2xl bg-rose-500 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-200"
            >
              {isLoading ? "送信中" : "送信"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
