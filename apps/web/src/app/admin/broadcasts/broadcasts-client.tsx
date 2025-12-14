"use client";

import { useState, useEffect, useCallback } from "react";
import { Megaphone, RefreshCw, Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminBroadcastRow = {
  id: string;
  subject: string;
  body: string;
  created_at: string;
  target_count: number;
};

type AdminUserRow = {
  id: string;
  displayName: string | null;
  email: string | null;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export function BroadcastsManagementClient() {
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientResults, setRecipientResults] = useState<AdminUserRow[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<AdminUserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  const loadBroadcasts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{ broadcasts: AdminBroadcastRow[] }>("/api/admin/broadcasts");
      setBroadcasts(data.broadcasts ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBroadcasts();
  }, [loadBroadcasts]);

  const searchRecipients = async () => {
    if (!recipientQuery.trim()) {
      setRecipientResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await fetchJson<{ users: AdminUserRow[] }>(
        `/api/admin/users?q=${encodeURIComponent(recipientQuery)}`
      );
      setRecipientResults(data.users ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const addRecipient = (user: AdminUserRow) => {
    if (!selectedRecipients.find((u) => u.id === user.id)) {
      setSelectedRecipients((prev) => [...prev, user]);
    }
    setRecipientQuery("");
    setRecipientResults([]);
  };

  const removeRecipient = (userId: string) => {
    setSelectedRecipients((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      alert("件名と本文を入力してください");
      return;
    }
    if (audience === "selected" && selectedRecipients.length === 0) {
      alert("送信先のユーザーを選択してください");
      return;
    }
    if (!confirm(`${audience === "all" ? "全ユーザー" : `${selectedRecipients.length}人`}に配信しますか？`)) {
      return;
    }

    setSending(true);
    try {
      await fetchJson("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          audience,
          recipients: audience === "selected" ? selectedRecipients.map((u) => u.id) : undefined
        })
      });
      alert("配信を開始しました");
      setSubject("");
      setBody("");
      setAudience("all");
      setSelectedRecipients([]);
      loadBroadcasts();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "配信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-amber-500">BROADCASTS</p>
          <h1 className="text-4xl font-black text-slate-900">お知らせ配信</h1>
          <p className="text-sm text-slate-500">
            ユーザーへのお知らせ一斉配信・履歴管理
          </p>
        </header>

        {/* Broadcast Form */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-bold text-slate-900">新規配信</h3>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">件名</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="お知らせの件名"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">本文</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="お知らせの内容"
                  className="mt-1 h-32 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">配信先</label>
                <div className="mt-1 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={audience === "all"}
                      onChange={() => setAudience("all")}
                    />
                    <span className="text-sm">全ユーザー</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={audience === "selected"}
                      onChange={() => setAudience("selected")}
                    />
                    <span className="text-sm">個別選択</span>
                  </label>
                </div>
              </div>
              {audience === "selected" && (
                <div>
                  <label className="text-xs font-semibold text-slate-600">ユーザー検索</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={recipientQuery}
                      onChange={(e) => setRecipientQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchRecipients()}
                      placeholder="名前やメールで検索"
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <Button size="sm" onClick={searchRecipients} disabled={searching}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  {recipientResults.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                      {recipientResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => addRecipient(user)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          {user.displayName ?? "No Name"} ({user.email})
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedRecipients.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold text-slate-600">選択中 ({selectedRecipients.length}人)</p>
                      {selectedRecipients.map((user) => (
                        <div key={user.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1 text-xs">
                          <span>{user.displayName ?? "No Name"}</span>
                          <button onClick={() => removeRecipient(user.id)} className="text-rose-600 hover:underline">
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <Button
                onClick={handleSend}
                disabled={sending}
                className="w-full bg-amber-500 text-white hover:bg-amber-600"
              >
                <Send className="mr-2 h-4 w-4" />
                {sending ? "配信中..." : "配信する"}
              </Button>
            </div>
          </div>

          {/* Broadcast History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">配信履歴</h3>
              <button
                onClick={loadBroadcasts}
                className="rounded-full border border-slate-200 p-2 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {loading ? (
              <p className="mt-4 text-center text-sm text-slate-500">読み込み中...</p>
            ) : broadcasts.length === 0 ? (
              <p className="mt-4 text-center text-sm text-slate-500">まだ配信履歴がありません</p>
            ) : (
              <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto">
                {broadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <p className="font-semibold text-slate-900">{broadcast.subject}</p>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{broadcast.body}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{new Date(broadcast.created_at).toLocaleString("ja-JP", { hour12: false })}</span>
                      <span>{broadcast.target_count}人に配信</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
