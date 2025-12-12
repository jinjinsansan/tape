"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, UserCheck, Coins, CreditCard, Lock, Unlock } from "lucide-react";

type UserWallet = {
  balanceCents: number;
  status: string;
};

type AdminUser = {
  id: string;
  displayName: string | null;
  email: string | null;
  role: string;
  wallet: UserWallet | null;
  twitterUsername: string | null;
  xShareCount: number | null;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export function UsersManagementClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState<string>("user");

  const loadUsers = useCallback(async (search = "") => {
    setLoading(true);
    try {
      const q = search ? `?q=${encodeURIComponent(search)}` : "";
      const data = await fetchJson<{ users: AdminUser[]; userRole: string }>(`/api/admin/users${q}`);
      setUsers(data.users ?? []);
      setUserRole(data.userRole ?? "user");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await fetchJson(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "ロール変更に失敗しました");
    }
  };

  const handleMakeCounselor = async (userId: string) => {
    if (!confirm("このユーザーをカウンセラーにしますか？")) return;
    try {
      await fetchJson(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "counselor" })
      });
      alert("カウンセラー権限を付与しました");
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "権限付与に失敗しました");
    }
  };

  const handlePointAward = async (userId: string) => {
    const pointsStr = prompt("付与するポイント数を入力してください", "100");
    if (!pointsStr) return;
    const points = Number(pointsStr);
    if (!Number.isFinite(points) || points <= 0 || points > 100000) {
      alert("ポイント数が不正です（1〜100000の範囲で入力してください）");
      return;
    }
    const reason = prompt("付与理由を入力してください (任意)") ?? undefined;
    try {
      await fetchJson(`/api/admin/users/${userId}/award-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, reason })
      });
      alert(`${points}ポイントを付与しました`);
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "ポイント付与に失敗しました");
    }
  };

  const handleWalletAdjust = async (userId: string, direction: "credit" | "debit") => {
    const amount = prompt("金額（円）を入力してください", "1000");
    if (!amount) return;
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      alert("金額が不正です");
      return;
    }
    const reason = prompt("理由 (任意)") ?? undefined;
    try {
      await fetchJson(`/api/admin/users/${userId}/wallet-adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: cents, direction, reason })
      });
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "ウォレット調整に失敗しました");
    }
  };

  const handleWalletStatus = async (userId: string, status: string) => {
    const action = status === "active" ? "凍結" : "凍結解除";
    if (!confirm(`このユーザーのウォレットを${action}しますか？`)) return;
    try {
      await fetchJson(`/api/admin/users/${userId}/wallet-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      loadUsers(userSearch);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "ステータス変更に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-blue-500">USER MANAGEMENT</p>
          <h1 className="text-4xl font-black text-slate-900">ユーザー管理</h1>
          <p className="text-sm text-slate-500">
            ユーザーの検索・ロール変更・ウォレット調整を管理
          </p>
        </header>

        {/* Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                loadUsers(e.target.value);
              }}
              placeholder="名前・メール・IDで検索"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">ユーザー一覧</h2>
            <p className="text-sm text-slate-500">{users.length}人</p>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">読み込み中...</p>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">ユーザーが見つかりません</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 truncate">
                        {user.displayName ?? "No Name"}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          user.role === "admin"
                            ? "bg-blue-100 text-blue-700"
                            : user.role === "counselor"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 truncate">{user.id}</p>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      {user.email ?? "メール未登録"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-slate-600">
                        💰 {user.wallet?.balanceCents ?? 0} JPY
                      </span>
                      <span
                        className={`${
                          user.wallet?.status === "active"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {user.wallet?.status === "active" ? "🔓 アクティブ" : "🔒 凍結"}
                      </span>
                      {user.twitterUsername && (
                        <>
                          <span className="text-blue-600">
                            🐦 @{user.twitterUsername}
                          </span>
                          <a
                            href={`https://x.com/search?q=%23かんじょうにっき%20OR%20%23テープ式心理学%20from%3A${user.twitterUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            投稿確認 ({user.xShareCount ?? 0}回)
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {userRole === "admin" && (
                      <>
                        <button
                          onClick={() => handleRoleChange(user.id, "admin")}
                          className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-600 transition-colors hover:bg-blue-100"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Admin化
                        </button>
                        <button
                          onClick={() => handleMakeCounselor(user.id)}
                          className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs text-purple-600 transition-colors hover:bg-purple-100"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          カウンセラー化
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handlePointAward(user.id)}
                      className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-600 transition-colors hover:bg-amber-100"
                    >
                      <Coins className="h-3.5 w-3.5" />
                      ポイント付与
                    </button>
                    <button
                      onClick={() => handleWalletAdjust(user.id, "credit")}
                      className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-600 transition-colors hover:bg-green-100"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      残高付与
                    </button>
                    <button
                      onClick={() =>
                        handleWalletStatus(
                          user.id,
                          user.wallet?.status === "active" ? "locked" : "active"
                        )
                      }
                      className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-100"
                    >
                      {user.wallet?.status === "active" ? (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          凍結
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3.5 w-3.5" />
                          解除
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
