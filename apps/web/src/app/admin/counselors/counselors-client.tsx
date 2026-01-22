"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, UserCheck, Calendar, BadgeCheck, Edit2, X, Upload, AlertTriangle } from "lucide-react";
import { COUNSELOR_PLAN_CONFIGS, normalizePlanSelection } from "@/constants/counselor-plans";

type Counselor = {
  id: string;
  slug: string;
  display_name: string | null;
  bio: string | null;
  specialties: string[];
  hourly_rate_cents: number | null;
  profile_metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res.json();
}

export function CounselorsManagementClient() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCounselor, setEditingCounselor] = useState<Counselor | null>(null);
  const [editForm, setEditForm] = useState({
    display_name: "",
    slug: "",
    avatar_url: "",
    bio: "",
    specialties: "",
    intro_video_url: ""
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugWarning, setSlugWarning] = useState(false);

  const loadCounselors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{
        counselors: Array<
          Omit<Counselor, "specialties" | "profile_metadata"> & {
            specialties: string[] | null;
            profile_metadata: Record<string, unknown> | null;
          }
        >
      }>("/api/admin/counselors");
      const normalized = Array.isArray(data.counselors)
        ? data.counselors.map((counselor) => ({
            ...counselor,
            specialties: Array.isArray(counselor.specialties) ? counselor.specialties : [],
            profile_metadata: counselor.profile_metadata ?? null
          }))
        : [];
      setCounselors(normalized);
    } catch (err) {
      console.error(err);
      setCounselors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounselors();
  }, [loadCounselors]);

  const handleEditClick = (counselor: Counselor) => {
    setEditingCounselor(counselor);
    setEditForm({
      display_name: counselor.display_name ?? "",
      slug: counselor.slug,
      avatar_url: counselor.avatar_url ?? "",
      bio: counselor.bio ?? "",
      specialties: Array.isArray(counselor.specialties) ? counselor.specialties.join(", ") : "",
      intro_video_url: counselor.intro_video_url ?? ""
    });
    setSlugWarning(false);
  };

  const handleCloseModal = () => {
    if (saving) return;
    setEditingCounselor(null);
    setEditForm({
      display_name: "",
      slug: "",
      avatar_url: "",
      bio: "",
      specialties: "",
      intro_video_url: ""
    });
    setSlugWarning(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCounselor) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      alert("ファイルサイズは5MB以下にしてください");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/admin/counselors/${editingCounselor.id}/avatar`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "画像のアップロードに失敗しました");
      }

      const data = await res.json();
      setEditForm({ ...editForm, avatar_url: data.url });
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "画像のアップロードに失敗しました");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!editingCounselor) return;

    if (!editForm.display_name.trim()) {
      alert("表示名を入力してください");
      return;
    }

    if (!editForm.slug.trim()) {
      alert("スラッグを入力してください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/counselors/${editingCounselor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: editForm.display_name.trim(),
          slug: editForm.slug.trim(),
          avatar_url: editForm.avatar_url.trim() || null,
          bio: editForm.bio.trim() || null,
          specialties: editForm.specialties
            ? editForm.specialties.split(",").map(s => s.trim()).filter(Boolean)
            : null,
          intro_video_url: editForm.intro_video_url.trim() || null
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "更新に失敗しました");
      }

      alert("カウンセラー情報を更新しました");
      handleCloseModal();
      await loadCounselors();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-purple-500">COUNSELORS</p>
          <h1 className="text-4xl font-black text-slate-900">カウンセラー管理</h1>
          <p className="text-sm text-slate-500">
            カウンセラーのプロフィール情報確認
          </p>
        </header>

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            登録カウンセラー: <span className="font-bold">{counselors.length}</span>人
          </div>
          <button
            onClick={loadCounselors}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            再読み込み
          </button>
        </div>

        {/* Info Box */}
        <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
          <p className="text-sm text-purple-900">
            💡 <strong>新規カウンセラーの追加</strong>
          </p>
          <p className="mt-1 text-xs text-purple-700">
            「ユーザー管理」ページで対象ユーザーを「カウンセラー化」してください。
            プロフィール編集は各カウンセラーが自分のダッシュボード（/dashboard/counselor）から行います。
          </p>
        </div>

        {/* Counselors List */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-slate-500">読み込み中...</p>
          </div>
        ) : counselors.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <UserCheck className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-semibold text-slate-700">カウンセラーが登録されていません</p>
            <p className="mt-2 text-sm text-slate-500">
              ユーザー管理ページから新規カウンセラーを追加してください
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {counselors.map((counselor) => (
              <div
                key={counselor.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-purple-100 p-3">
                      <UserCheck className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {counselor.display_name ?? "名前未設定"}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        登録: {new Date(counselor.created_at).toLocaleDateString("ja-JP")}
                      </div>
                      <p className="text-[11px] text-slate-400">slug: {counselor.slug}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      counselor.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <BadgeCheck className="h-3 w-3" />
                    {counselor.is_active ? "アクティブ" : "停止中"}
                  </span>
                </div>

                <button
                  onClick={() => handleEditClick(counselor)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
                >
                  <Edit2 className="h-4 w-4" />
                  編集
                </button>

                {counselor.bio && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-600">プロフィール</p>
                    <p className="mt-1 text-sm text-slate-700">{counselor.bio}</p>
                  </div>
                )}

                {(() => {
                  const planSelection = normalizePlanSelection(counselor.profile_metadata);
                  const activePlans = Object.values(COUNSELOR_PLAN_CONFIGS).filter((plan) => planSelection[plan.id]);
                  if (activePlans.length === 0) return null;
                  return (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-600">提供プラン</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activePlans.map((plan) => (
                          <span
                            key={`${counselor.id}-${plan.id}`}
                            className="inline-flex flex-col rounded-2xl border border-purple-100 bg-purple-50/60 px-3 py-2 text-xs text-purple-700"
                          >
                            <span className="font-semibold">{plan.title}</span>
                            <span className="text-[11px] text-purple-600">¥{plan.priceYen.toLocaleString()}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {counselor.specialties.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-600">専門分野</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {counselor.specialties.map((exp, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {typeof counselor.hourly_rate_cents === "number" && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="text-slate-600">料金:</span>
                    <span className="font-bold text-slate-900">
                      ¥{counselor.hourly_rate_cents.toLocaleString()} / 時間
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      {editingCounselor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleCloseModal}>
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">カウンセラー編集</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {editingCounselor.display_name ?? "名前未設定"} のプロフィールを編集
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={saving}
                className="rounded-full p-2 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 表示名 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  表示名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="山田 太郎"
                />
              </div>

              {/* スラッグ */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  スラッグ（URL） <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={(e) => {
                    setEditForm({ ...editForm, slug: e.target.value });
                    if (e.target.value !== editingCounselor.slug) {
                      setSlugWarning(true);
                    } else {
                      setSlugWarning(false);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="yamada-taro"
                />
                <p className="mt-1 text-xs text-slate-500">
                  カウンセラーページURL: /counselor/{editForm.slug || "スラッグ"}
                </p>
                {slugWarning && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800">
                      <strong>警告:</strong> スラッグを変更すると、既存のカウンセラーページURL（/counselor/{editingCounselor.slug}）が変わります。既存の共有リンクや予約リンクが無効になる可能性があります。
                    </p>
                  </div>
                )}
              </div>

              {/* アバター画像 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">アバター画像</label>
                <div className="flex items-center gap-4">
                  {editForm.avatar_url && (
                    <img
                      src={editForm.avatar_url}
                      alt="Preview"
                      className="h-16 w-16 rounded-full object-cover border border-slate-200"
                    />
                  )}
                  <div className="flex-1">
                    <label className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <Upload className="h-4 w-4" />
                      {uploadingAvatar ? "アップロード中..." : "画像をアップロード"}
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar || saving}
                        className="hidden"
                      />
                    </label>
                    <p className="mt-1 text-xs text-slate-500">JPEG、PNG、WebP形式、最大5MB</p>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">またはURLを直接入力</label>
                  <input
                    type="url"
                    value={editForm.avatar_url}
                    onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* プロフィール */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">自己紹介</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="カウンセラーとしての経歴や得意分野を記入してください"
                />
              </div>

              {/* 専門分野 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">専門分野（カンマ区切り）</label>
                <input
                  type="text"
                  value={editForm.specialties}
                  onChange={(e) => setEditForm({ ...editForm, specialties: e.target.value })}
                  placeholder="恋愛, 職場, HSP"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* 紹介動画URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">紹介動画URL（YouTube埋め込み用）</label>
                <input
                  type="url"
                  value={editForm.intro_video_url}
                  onChange={(e) => setEditForm({ ...editForm, intro_video_url: e.target.value })}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* ボタン */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <button
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || uploadingAvatar}
                  className="rounded-full bg-purple-500 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
