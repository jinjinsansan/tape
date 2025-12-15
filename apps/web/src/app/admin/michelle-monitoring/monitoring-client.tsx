"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, User, Clock, LogOut, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import isEqual from "lodash/isEqual";

type UrgencyLevel = "normal" | "attention" | "urgent" | "critical";

type Session = {
  id: string;
  auth_user_id: string;
  category: string;
  title: string | null;
  urgency_level: UrgencyLevel;
  urgency_notes: string | null;
  urgency_updated_at: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  profiles: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
};

type Message = {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

type LoadOptions = {
  showSpinner?: boolean;
};

const URGENCY_COLORS: Record<UrgencyLevel, { bg: string; border: string; text: string; label: string }> = {
  normal: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-700", label: "通常" },
  attention: { bg: "bg-yellow-100", border: "border-yellow-400", text: "text-yellow-800", label: "注意" },
  urgent: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-800", label: "緊急" },
  critical: { bg: "bg-red-100", border: "border-red-500", text: "text-red-800", label: "最重要" },
};

const DANGER_KEYWORDS = [
  "死にたい", "消えたい", "終わりにしたい", "生きてる意味", "自殺", "リストカット",
  "死ぬ", "殺", "苦しい", "辛い", "限界", "助けて", "もう無理", "絶望"
];

function highlightDangerKeywords(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Find all keyword matches
  const matches: Array<{ index: number; length: number; keyword: string }> = [];
  
  DANGER_KEYWORDS.forEach((keyword) => {
    let index = text.indexOf(keyword);
    while (index !== -1) {
      matches.push({ index, length: keyword.length, keyword });
      index = text.indexOf(keyword, index + 1);
    }
  });

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Build highlighted text
  matches.forEach((match, i) => {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <span key={`highlight-${i}`} className="bg-red-200 font-bold text-red-900 px-1 rounded">
        {match.keyword}
      </span>
    );
    lastIndex = match.index + match.length;
  });

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function MonitoringClient() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | "all">("all");
  const [isPageVisible, setIsPageVisible] = useState(true);
  const sessionsLoadedRef = useRef(false);
  const lastLoadedSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleVisibility = () => setIsPageVisible(!document.hidden);
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const loadSessions = useCallback(async ({ showSpinner = false }: LoadOptions = {}) => {
    if (showSpinner) {
      setIsLoadingSessions(true);
    }

    try {
      const res = await fetch("/api/admin/michelle-master/sessions", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load sessions");

      const data = await res.json();
      const nextSessions: Session[] = data.sessions || [];

      setSessions((prev) => (isEqual(prev, nextSessions) ? prev : nextSessions));
      setSelectedSession((prev) => {
        if (!prev) return prev;
        const latest = nextSessions.find((session) => session.id === prev.id);
        if (!latest) return null;
        return isEqual(prev, latest) ? prev : latest;
      });
      setError(null);
      sessionsLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "セッション読み込みエラー");
    } finally {
      if (showSpinner) {
        setIsLoadingSessions(false);
      }
    }
  }, []);

  const loadMessages = useCallback(
    async (sessionId: string, { showSpinner = false }: LoadOptions = {}) => {
      if (showSpinner) {
        setIsLoadingMessages(true);
      }

      try {
        const res = await fetch(`/api/admin/michelle-master/sessions/${sessionId}/messages`, {
          cache: "no-store"
        });
        if (!res.ok) throw new Error("Failed to load messages");

        const data = await res.json();
        const nextMessages: Message[] = data.messages || [];
        setMessages((prev) => (isEqual(prev, nextMessages) ? prev : nextMessages));
        setError(null);
        lastLoadedSessionIdRef.current = sessionId;
      } catch (err) {
        setError(err instanceof Error ? err.message : "メッセージ読み込みエラー");
      } finally {
        if (showSpinner) {
          setIsLoadingMessages(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!isPageVisible) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async (initial: boolean) => {
      await loadSessions({ showSpinner: initial });
      if (cancelled) return;
      timeoutId = setTimeout(() => poll(false), 30000);
    };

    poll(!sessionsLoadedRef.current);

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isPageVisible, loadSessions]);

  useEffect(() => {
    const activeSessionId = selectedSession?.id;
    if (!activeSessionId || !isPageVisible) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const needsSpinner = lastLoadedSessionIdRef.current !== activeSessionId;

    const poll = async (initial: boolean) => {
      await loadMessages(activeSessionId, { showSpinner: initial });
      if (cancelled) return;
      timeoutId = setTimeout(() => poll(false), 10000);
    };

    poll(needsSpinner);

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedSession?.id, isPageVisible, loadMessages]);

  const updateUrgency = async (sessionId: string, level: UrgencyLevel, notes?: string) => {
    try {
      const res = await fetch(`/api/admin/michelle-master/sessions/${sessionId}/urgency`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, notes }),
      });

      if (!res.ok) throw new Error("Failed to update urgency");
      
      // Refresh sessions
      await loadSessions();
      
      // Update selected session if it's the one we just updated
      if (selectedSession?.id === sessionId) {
        const updated = sessions.find(s => s.id === sessionId);
        if (updated) {
          setSelectedSession({
            ...updated,
            urgency_level: level,
            urgency_notes: notes || null,
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "緊急度更新エラー");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/michelle-master/auth", { method: "DELETE" });
    window.location.reload();
  };

  const filteredSessions = urgencyFilter === "all" 
    ? sessions 
    : sessions.filter(s => s.urgency_level === urgencyFilter);

  const hasDangerKeywords = (text: string) => {
    return DANGER_KEYWORDS.some(keyword => text.includes(keyword));
  };

  if (isLoadingSessions) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - User List */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">ミシェル心理学監視</h1>
            <Button onClick={handleLogout} variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Urgency Filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={urgencyFilter === "all" ? "default" : "outline"}
              onClick={() => setUrgencyFilter("all")}
            >
              全て ({sessions.length})
            </Button>
            {(["critical", "urgent", "attention"] as UrgencyLevel[]).map((level) => {
              const count = sessions.filter(s => s.urgency_level === level).length;
              const colors = URGENCY_COLORS[level];
              return (
                <Button
                  key={level}
                  size="sm"
                  variant={urgencyFilter === level ? "default" : "outline"}
                  onClick={() => setUrgencyFilter(level)}
                  className={urgencyFilter === level ? colors.bg : ""}
                >
                  {colors.label} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              セッションがありません
            </div>
          ) : (
            filteredSessions.map((session) => {
              const colors = URGENCY_COLORS[session.urgency_level];
              const isSelected = selectedSession?.id === session.id;
              
              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={cn(
                    "border-b border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                    isSelected && "bg-pink-50",
                    colors.bg
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900 truncate">
                          {session.profiles?.display_name || "名無し"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {session.title || "無題のセッション"}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {session.message_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(session.updated_at).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-semibold flex-shrink-0",
                      colors.bg,
                      colors.text
                    )}>
                      {colors.label}
                    </span>
                  </div>
                  
                  {session.urgency_notes && (
                    <div className="mt-2 text-xs bg-white rounded p-2 border border-gray-200">
                      📝 {session.urgency_notes}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Chat History */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            {/* Header */}
            <div className="border-b border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedSession.profiles?.display_name || "名無し"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedSession.profiles?.email || "メールアドレス未登録"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    セッション開始: {new Date(selectedSession.created_at).toLocaleString("ja-JP")}
                  </p>
                </div>
                
                {/* Urgency Buttons */}
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-gray-500 text-right">緊急度設定:</div>
                  <div className="flex gap-2">
                    {(["normal", "attention", "urgent", "critical"] as UrgencyLevel[]).map((level) => {
                      const colors = URGENCY_COLORS[level];
                      const isActive = selectedSession.urgency_level === level;
                      
                      return (
                        <Button
                          key={level}
                          size="sm"
                          variant={isActive ? "default" : "outline"}
                          onClick={() => {
                            const notes = prompt("メモ（任意）:", selectedSession.urgency_notes || "");
                            if (notes !== null) {
                              updateUrgency(selectedSession.id, level, notes);
                            }
                          }}
                          className={cn(
                            isActive && colors.bg,
                            isActive && colors.text,
                            "text-xs"
                          )}
                        >
                          {colors.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-pink-50/30 to-purple-50/30">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  メッセージがありません
                </div>
              ) : (
                messages.map((message) => {
                  const isDanger = message.role === "user" && hasDangerKeywords(message.content);
                  
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                          🤖
                        </div>
                      )}
                      
                      <div className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
                        message.role === "user" 
                          ? isDanger 
                            ? "bg-red-100 border-2 border-red-500" 
                            : "bg-blue-100"
                          : "bg-white border border-gray-200"
                      )}>
                        {isDanger && (
                          <div className="flex items-center gap-1 mb-2 text-red-700 font-semibold text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            危険ワード検出
                          </div>
                        )}
                        
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.role === "user" && hasDangerKeywords(message.content)
                            ? highlightDangerKeywords(message.content)
                            : message.content}
                        </p>
                        
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(message.created_at).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      
                      {message.role === "user" && (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            左側からセッションを選択してください
          </div>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
