"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Plus, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type PointRule = {
  action: string;
  points: number;
  is_active: boolean;
};

type PointRewardRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cost_points: number;
  stock: number | null;
  is_active: boolean;
};

type PointRedemptionRow = {
  id: string;
  points_spent: number;
  status: string;
  created_at: string;
  reward: { title: string } | null;
  user: { display_name: string; id: string } | null;
};

const pointActionLabels: Record<string, { label: string; hint: string }> = {
  diary_post: { label: "日記投稿", hint: "日記を1件投稿するごと" },
  feed_comment: { label: "コメント", hint: "みんなの日記にコメントするごと" },
  x_share: { label: "Xシェア", hint: "みんなの日記をXでシェアするごと" },
  referral_5day: { label: "紹介特典(5日)", hint: "紹介したユーザーが5日継続" },
  referral_10day: { label: "紹介特典(10日)", hint: "紹介したユーザーが10日継続" }
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export function PointsManagementClient() {
  const [pointRules, setPointRules] = useState<PointRule[]>([]);
  const [pointRewards, setPointRewards] = useState<PointRewardRow[]>([]);
  const [pointRedemptions, setPointRedemptions] = useState<PointRedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRule, setSavingRule] = useState<string | null>(null);
  const [rewardForm, setRewardForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    costPoints: 1000,
    stock: "",
    isActive: true
  });
  const [rewardImageFile, setRewardImageFile] = useState<File | null>(null);
  const [rewardImagePreview, setRewardImagePreview] = useState<string | null>(null);
  const [creatingReward, setCreatingReward] = useState(false);

  const loadPointOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{
        rules: PointRule[];
        rewards: PointRewardRow[];
        redemptions: PointRedemptionRow[];
      }>("/api/admin/points/overview");
      setPointRules(data.rules ?? []);
      setPointRewards(data.rewards ?? []);
      setPointRedemptions(data.redemptions ?? []);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPointOverview();
  }, [loadPointOverview]);

  // 画像プレビューのクリーンアップ
  useEffect(() => {
    return () => {
      if (rewardImagePreview) {
        URL.revokeObjectURL(rewardImagePreview);
      }
    };
  }, [rewardImagePreview]);

  const handleRuleValueChange = (action: string, field: "points" | "is_active", value: number | boolean) => {
    setPointRules((prev) =>
      prev.map((rule) => (rule.action === action ? { ...rule, [field]: value } : rule))
    );
  };

  const handleSaveRule = async (rule: PointRule) => {
    setSavingRule(rule.action);
    try {
      await fetchJson("/api/admin/points/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule)
      });
      alert("ルールを更新しました");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSavingRule(null);
    }
  };

  const handleRewardImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("画像サイズは5MB以下にしてください");
      return;
    }
    // 新しいURLを作成する前に古いURLを解放
    if (rewardImagePreview) {
      URL.revokeObjectURL(rewardImagePreview);
    }
    setRewardImageFile(file);
    const preview = URL.createObjectURL(file);
    setRewardImagePreview(preview);
  };

  const handleCreateReward = async () => {
    if (!rewardForm.title.trim()) {
      alert("景品名を入力してください");
      return;
    }
    setCreatingReward(true);
    try {
      let finalImageUrl = rewardForm.imageUrl;
      if (rewardImageFile) {
        const formData = new FormData();
        formData.append("file", rewardImageFile);
        const uploadRes = await fetchJson<{ url: string }>("/api/upload/image", {
          method: "POST",
          body: formData
        });
        finalImageUrl = uploadRes.url;
      }

      await fetchJson("/api/admin/points/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: rewardForm.title,
          description: rewardForm.description || null,
          imageUrl: finalImageUrl || null,
          costPoints: rewardForm.costPoints,
          stock: rewardForm.stock ? Number(rewardForm.stock) : null,
          isActive: rewardForm.isActive
        })
      });

      alert("景品を登録しました");
      setRewardForm({
        title: "",
        description: "",
        imageUrl: "",
        costPoints: 1000,
        stock: "",
        isActive: true
      });
      setRewardImageFile(null);
      setRewardImagePreview(null);
      loadPointOverview();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setCreatingReward(false);
    }
  };

  const handleRewardToggle = async (rewardId: string, isActive: boolean) => {
    try {
      await fetchJson(`/api/admin/points/rewards/${rewardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive })
      });
      loadPointOverview();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-emerald-500">POINTS MANAGEMENT</p>
          <h1 className="text-4xl font-black text-slate-900">ポイント管理</h1>
          <p className="text-sm text-slate-500">
            ポイント獲得ルール・景品カタログ・交換履歴を管理
          </p>
        </header>

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            景品 <span className="font-bold">{pointRewards.length}</span> 件 / 
            交換履歴 <span className="font-bold">{pointRedemptions.length}</span> 件
          </div>
          <button
            onClick={loadPointOverview}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            再読み込み
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-slate-500">読み込み中...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Point Rules */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">ポイント獲得ルール</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {pointRules.map((rule) => {
                  const info = pointActionLabels[rule.action] ?? { label: rule.action, hint: "" };
                  return (
                    <div key={rule.action} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{info.label}</p>
                          <p className="text-xs text-slate-500">{info.hint}</p>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-slate-500">
                          <input
                            type="checkbox"
                            checked={rule.is_active}
                            onChange={(e) => handleRuleValueChange(rule.action, "is_active", e.target.checked)}
                          />
                          有効
                        </label>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={rule.points}
                          onChange={(e) => handleRuleValueChange(rule.action, "points", Number(e.target.value) || 0)}
                          className="w-24 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-800"
                        />
                        <span className="text-xs text-slate-500">pt / 回</span>
                        <Button
                          size="sm"
                          className="ml-auto bg-emerald-500 text-white hover:bg-emerald-600"
                          disabled={savingRule === rule.action}
                          onClick={() => handleSaveRule(rule)}
                        >
                          {savingRule === rule.action ? "更新中" : "更新"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rewards Management */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Create Reward */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-900">景品を追加</h3>
                </div>
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    placeholder="景品名"
                    value={rewardForm.title}
                    onChange={(e) => setRewardForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <textarea
                    placeholder="説明 (任意)"
                    value={rewardForm.description}
                    onChange={(e) => setRewardForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600">
                      景品画像 (推奨: 800×600px, 最大5MB)
                    </label>
                    {rewardImagePreview && (
                      <div className="relative inline-block">
                        <img
                          src={rewardImagePreview}
                          alt="プレビュー"
                          className="h-24 w-32 rounded-lg border border-slate-200 object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100">
                        <ImageIcon className="h-4 w-4" />
                        ファイル選択
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleRewardImageChange}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs text-slate-400">または</span>
                    </div>
                    <input
                      type="url"
                      placeholder="画像URL (直接入力)"
                      value={rewardForm.imageUrl}
                      onChange={(e) => setRewardForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-600">必要ポイント</span>
                      <input
                        type="number"
                        min={1}
                        value={rewardForm.costPoints}
                        onChange={(e) => setRewardForm((prev) => ({ ...prev, costPoints: Number(e.target.value) || 0 }))}
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-600">在庫 (空欄で無制限)</span>
                      <input
                        type="number"
                        min={0}
                        value={rewardForm.stock}
                        onChange={(e) => setRewardForm((prev) => ({ ...prev, stock: e.target.value }))}
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={rewardForm.isActive}
                      onChange={(e) => setRewardForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    />
                    公開状態で追加する
                  </label>
                  <Button
                    onClick={handleCreateReward}
                    disabled={creatingReward}
                    className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    {creatingReward ? "作成中..." : "景品を登録"}
                  </Button>
                </div>
              </div>

              {/* Rewards List */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">公開中の景品</h3>
                {pointRewards.length === 0 ? (
                  <p className="mt-4 text-center text-sm text-slate-500">まだ登録された景品がありません</p>
                ) : (
                  <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto">
                    {pointRewards.map((reward) => (
                      <div
                        key={reward.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{reward.title}</p>
                          <p className="text-xs text-slate-500">
                            {reward.cost_points.toLocaleString()}pt / 在庫:
                            {reward.stock === null ? "∞" : reward.stock}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold ${reward.is_active ? "text-emerald-500" : "text-slate-400"}`}
                          >
                            {reward.is_active ? "公開" : "非公開"}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRewardToggle(reward.id, !reward.is_active)}
                          >
                            {reward.is_active ? "公開停止" : "公開"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Redemption History */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">最近のポイント交換</h3>
              {pointRedemptions.length === 0 ? (
                <p className="mt-4 text-center text-sm text-slate-500">まだ交換履歴がありません</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {pointRedemptions.slice(0, 10).map((redeem) => (
                    <div
                      key={redeem.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{redeem.reward?.title ?? "景品"}</p>
                        <p className="text-slate-500">
                          {redeem.user?.display_name ?? redeem.user?.id ?? "ユーザー"} /{" "}
                          {new Date(redeem.created_at).toLocaleString("ja-JP", { hour12: false })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-rose-600">-{redeem.points_spent}pt</p>
                        <p className="text-slate-500">{redeem.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
