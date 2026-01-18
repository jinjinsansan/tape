"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DIARY_BORDER_TIERS, getDiaryBorderColor, getDiaryTierForCount, getNextDiaryTier, COUNSELOR_BORDER_COLOR } from "@/constants/diary-badge";

type Profile = {
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
};

type MyPageClientProps = {
  initialProfile: Profile;
  badgeMeta: {
    diaryCount: number;
    role: string | null;
  };
};

const DEFAULT_AVATAR = "https://placehold.co/120x120/F5F2EA/5C554F?text=User";
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export function MyPageClient({ initialProfile, badgeMeta }: MyPageClientProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialProfile.displayName ?? "");
  const [avatarPreview, setAvatarPreview] = useState(initialProfile.avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [twitterUsername, setTwitterUsername] = useState("");
  const [twitterUpdatedAt, setTwitterUpdatedAt] = useState<string | null>(null);
  const [twitterSubmitting, setTwitterSubmitting] = useState(false);
  const [twitterMessage, setTwitterMessage] = useState<string | null>(null);
  const [twitterError, setTwitterError] = useState<string | null>(null);
  const [diaryReminderEnabled, setDiaryReminderEnabled] = useState(true);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [onboardingEmailEnabled, setOnboardingEmailEnabled] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const diaryCount = badgeMeta?.diaryCount ?? 0;
  const userRole = badgeMeta?.role ?? null;
  const isCounselor = userRole === "counselor";
  const avatarBorderStyle = useMemo(
    () => ({ borderColor: getDiaryBorderColor(userRole, diaryCount) }),
    [userRole, diaryCount]
  );
  const currentTier = useMemo(() => getDiaryTierForCount(diaryCount), [diaryCount]);
  const nextTier = useMemo(() => getNextDiaryTier(diaryCount), [diaryCount]);
  const nextTierRemaining = nextTier ? Math.max(nextTier.threshold - diaryCount, 0) : 0;
  const progressMessage = isCounselor
    ? "カウンセラーは常に特別カラー（ディープパープル）で表示されます"
    : nextTier
      ? `次の${nextTier.label}まであと${nextTierRemaining}件`
      : "最上位のロイヤルローズ枠に到達しています！";

  const initials = useMemo(() => {
    if (displayName) {
      return displayName.slice(0, 2);
    }
    if (initialProfile.email) {
      return initialProfile.email.slice(0, 2).toUpperCase();
    }
    return "あなた";
  }, [displayName, initialProfile.email]);

  const handleAvatarChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("アイコン画像は2MB以下にしてください");
      return;
    }
    setAvatarFile(file);
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewObjectUrl(nextUrl);
    setAvatarPreview(nextUrl);
    setError(null);
    setMessage(null);
  }, [previewObjectUrl]);

  const handleResetAvatar = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreview(initialProfile.avatarUrl);
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      setPreviewObjectUrl(null);
    }
    setError(null);
    setMessage(null);
  }, [initialProfile.avatarUrl, previewObjectUrl]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [previewObjectUrl]);

  useEffect(() => {
    const loadTwitterProfile = async () => {
      try {
        const res = await fetch("/api/profile/twitter");
        if (res.ok) {
          const data = await res.json();
          setTwitterUsername(data.twitterUsername ?? "");
          setTwitterUpdatedAt(data.updatedAt);
        }
      } catch (err) {
        console.error("Failed to load Twitter profile", err);
      }
    };
    loadTwitterProfile();
  }, []);

  useEffect(() => {
    const loadDiaryReminderSetting = async () => {
      try {
        const res = await fetch("/api/profile/diary-reminder");
        if (res.ok) {
          const data = await res.json();
          setDiaryReminderEnabled(data.diaryReminderEnabled ?? true);
        }
      } catch (err) {
        console.error("Failed to load diary reminder setting", err);
      }
    };
    loadDiaryReminderSetting();
  }, []);

  useEffect(() => {
    const loadOnboardingEmailSetting = async () => {
      try {
        const res = await fetch("/api/profile/onboarding-email");
        if (res.ok) {
          const data = await res.json();
          setOnboardingEmailEnabled(data.onboardingEmailEnabled ?? true);
        }
      } catch (err) {
        console.error("Failed to load onboarding email setting", err);
      }
    };
    loadOnboardingEmailSetting();
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitting(true);
      setError(null);
      setMessage(null);

      const formData = new FormData();
      formData.append("displayName", displayName.trim());
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "プロフィールの更新に失敗しました");
        }

        const { profile } = (await response.json()) as { profile: Profile };
        setDisplayName(profile.displayName ?? "");
        setAvatarPreview(profile.avatarUrl ?? null);
        setAvatarFile(null);
        setMessage("プロフィールを更新しました");
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "プロフィールの更新に失敗しました");
      } finally {
        setSubmitting(false);
      }
    },
    [avatarFile, displayName]
  );

  const handleTwitterSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTwitterSubmitting(true);
      setTwitterError(null);
      setTwitterMessage(null);

      const username = twitterUsername.trim().replace(/^@/, "");

      try {
        const response = await fetch("/api/profile/twitter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ twitterUsername: username })
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? "Xアカウントの更新に失敗しました");
        }

        setTwitterUsername(payload.twitterUsername ?? "");
        setTwitterUpdatedAt(payload.updatedAt);
        setTwitterMessage("Xアカウントを更新しました");
      } catch (err) {
        console.error(err);
        setTwitterError(err instanceof Error ? err.message : "Xアカウントの更新に失敗しました");
      } finally {
        setTwitterSubmitting(false);
      }
    },
    [twitterUsername]
  );

  const canUpdateTwitter = useMemo(() => {
    if (!twitterUpdatedAt) return true;
    const lastUpdated = new Date(twitterUpdatedAt).getTime();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return now - lastUpdated >= sevenDaysMs;
  }, [twitterUpdatedAt]);

  const daysUntilTwitterUpdate = useMemo(() => {
    if (!twitterUpdatedAt || canUpdateTwitter) return 0;
    const lastUpdated = new Date(twitterUpdatedAt).getTime();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const remaining = sevenDaysMs - (now - lastUpdated);
    return Math.ceil(remaining / (24 * 60 * 60 * 1000));
  }, [twitterUpdatedAt, canUpdateTwitter]);

  const handleReminderToggle = useCallback(async () => {
    setReminderLoading(true);
    try {
      const response = await fetch("/api/profile/diary-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !diaryReminderEnabled })
      });

      if (!response.ok) {
        throw new Error("設定の更新に失敗しました");
      }

      const data = await response.json();
      setDiaryReminderEnabled(data.diaryReminderEnabled);
    } catch (err) {
      console.error("Failed to update diary reminder setting", err);
      alert(err instanceof Error ? err.message : "設定の更新に失敗しました");
    } finally {
      setReminderLoading(false);
    }
  }, [diaryReminderEnabled]);

  const handleOnboardingEmailToggle = useCallback(async () => {
    setOnboardingLoading(true);
    const wasEnabled = onboardingEmailEnabled;
    try {
      const response = await fetch("/api/profile/onboarding-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !onboardingEmailEnabled })
      });

      if (!response.ok) {
        throw new Error("設定の更新に失敗しました");
      }

      const data = await response.json();
      const nextEnabled = data.onboardingEmailEnabled;
      setOnboardingEmailEnabled(nextEnabled);

      if (!wasEnabled && nextEnabled) {
        fetch("/api/profile/onboarding-email/send-now", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceRestart: true })
        }).catch(() => {
          /* best-effort */
        });
      }
    } catch (err) {
      console.error("Failed to update onboarding email setting", err);
      alert(err instanceof Error ? err.message : "設定の更新に失敗しました");
    } finally {
      setOnboardingLoading(false);
    }
  }, [onboardingEmailEnabled]);

  const handleAccountDelete = useCallback(async () => {
    if (deletingAccount) {
      return;
    }
    const confirmed = window.confirm("本当にアカウントを削除しますか？全てのデータが失われます。");
    if (!confirmed) {
      return;
    }
    setDeletingAccount(true);
    setDeleteAccountError(null);
    try {
      const response = await fetch("/api/profile", { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "アカウントの削除に失敗しました");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
      setDeleteAccountError(err instanceof Error ? err.message : "アカウントの削除に失敗しました");
    } finally {
      setDeletingAccount(false);
    }
  }, [deletingAccount, router]);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3 rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">PROFILE</p>
        <h2 className="text-2xl font-bold text-tape-brown">マイページ</h2>
        <p className="text-sm text-tape-light-brown">
          ログイン情報や「みんなの日記」で表示されるユーザー名とアイコンを管理できます。
        </p>

        <div className="mt-6 flex flex-col gap-6 md:flex-row">
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-24 w-24">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={displayName || "ユーザーアイコン"}
                  className="h-24 w-24 rounded-full object-cover border"
                  style={avatarBorderStyle}
                />
              ) : (
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed bg-tape-cream text-sm text-tape-light-brown"
                  style={avatarBorderStyle}
                >
                  {initials}
                </div>
              )}
            </div>
            <label className="text-xs text-tape-light-brown" htmlFor="avatar">
              アイコン画像 (PNG/JPEG/WebP)
            </label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarChange}
              className="text-xs text-tape-light-brown"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleResetAvatar} disabled={submitting}>
                変更を取り消す
              </Button>
              <Link href="/feed" className="text-xs text-tape-light-brown underline-offset-4 hover:underline">
                アイコンの表示例を見る
              </Link>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-tape-light-brown" htmlFor="displayName">
                ユーザー名
              </label>
              <input
                id="displayName"
                name="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Tape さん"
                className="w-full rounded-2xl border border-tape-beige bg-tape-cream/50 px-4 py-3 text-sm text-tape-brown focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink"
                maxLength={50}
                required
              />
              <p className="text-xs text-tape-light-brown">
                この名前はサイト全体や「みんなの日記」に表示されます。
              </p>
            </div>

            <div className="space-y-1 text-sm text-tape-light-brown">
              <p>
                登録メールアドレス: <span className="font-semibold text-tape-brown">{initialProfile.email ?? "-"}</span>
              </p>
              <p>メールアドレスの変更をご希望の方はサポートまでご連絡ください。</p>
            </div>

            {error && <p className="text-sm text-tape-pink">{error}</p>}
            {message && <p className="text-sm text-tape-green">{message}</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting} className="bg-tape-pink text-tape-brown hover:bg-tape-pink/90">
                {submitting ? "保存中..." : "変更を保存"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <section className="space-y-4 rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">DIARY ICON</p>
        <h2 className="text-2xl font-bold text-tape-brown">アイコン枠線の段階</h2>
        <p className="text-sm text-tape-light-brown">
          「みんなの日記」に表示されるあなたのアイコン枠は、日記投稿数に応じて少しずつ華やかなカラーへ変化します。
        </p>

        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1 rounded-2xl border border-tape-beige bg-tape-cream/20 p-4">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-full bg-white">
                <div className="absolute inset-0 rounded-full border-[6px]" style={avatarBorderStyle} />
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-tape-brown">
                  {diaryCount}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-tape-light-brown">現在の枠線</p>
                <p className="text-lg font-bold text-tape-brown">
                  {isCounselor ? "カウンセラー専用カラー" : currentTier ? `${currentTier.label}` : "ベージュ枠"}
                </p>
                <p className="text-xs text-tape-light-brown">{progressMessage}</p>
              </div>
            </div>
            {!isCounselor && (
              <p className="mt-3 text-xs text-tape-light-brown">
                これまでの公開・非公開に関わらず日記投稿合計に応じて色がアップデートされます。
              </p>
            )}
            {isCounselor && (
              <p className="mt-3 text-xs text-tape-light-brown">
                カウンセラーは常にディープパープル（{COUNSELOR_BORDER_COLOR}）で表示されます。
              </p>
            )}
          </div>

          {!isCounselor && (
            <div className="flex-1 rounded-2xl border border-dashed border-tape-beige p-4">
              <p className="text-xs font-semibold text-tape-light-brown">次のステップ</p>
              {nextTier ? (
                <div className="mt-2 space-y-1 text-sm text-tape-brown">
                  <p>
                    次は <span className="font-semibold">{nextTier.label}</span>（{nextTier.threshold}件）
                  </p>
                  <p className="text-xs text-tape-light-brown">
                    あと {nextTierRemaining} 件の日記で到達します。
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-tape-brown">最上位カラーに到達済みです！おめでとうございます🎉</p>
              )}
              <div className="mt-4 rounded-2xl bg-tape-cream/40 p-3 text-xs text-tape-light-brown">
                継続の目安:
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  <li>3件で最初のカラー</li>
                  <li>30件で1か月分の記録</li>
                  <li>100件でスカイブルー</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DIARY_BORDER_TIERS.map((tier) => (
            <div key={tier.threshold} className="flex items-center gap-3 rounded-2xl border border-tape-beige/70 bg-tape-cream/10 p-3">
              <div className="h-10 w-10 rounded-full border-4" style={{ borderColor: tier.color }} />
              <div>
                <p className="text-sm font-semibold text-tape-brown">{tier.label}</p>
                <p className="text-xs text-tape-light-brown">{tier.threshold}件 / {tier.description}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-tape-light-brown">
          ※ 3件未満はベージュ枠です。カウンセラーは枠線が常にディープパープルになります。
        </p>
      </section>

      <section className="space-y-3 rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">DIARY REMINDER</p>
        <h2 className="text-2xl font-bold text-tape-brown">日記リマインダー</h2>
        <p className="text-sm text-tape-light-brown">
          毎日22時に、その日の日記を書いていない場合にメールでお知らせします。※当日22時の1通のみで、即時送信はありません。
        </p>

        <div className="mt-6 flex items-center justify-between rounded-2xl border border-tape-beige bg-tape-cream/30 p-4">
          <div className="space-y-1">
            <p className="font-semibold text-tape-brown">🌙 日記リマインダーメール</p>
            <p className="text-xs text-tape-light-brown">
              毎日22時に日記のリマインダーをメールで受け取る
            </p>
          </div>
          <button
            type="button"
            onClick={handleReminderToggle}
            disabled={reminderLoading}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-tape-pink focus:ring-offset-2 ${
              diaryReminderEnabled ? "bg-tape-pink" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                diaryReminderEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-tape-light-brown">
          ※ 配信停止は、いつでもこの設定から変更できます。
        </p>
      </section>

      <section className="space-y-3 rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">ONBOARDING EMAIL</p>
        <h2 className="text-2xl font-bold text-tape-brown">ステップメール</h2>
        <p className="text-sm text-tape-light-brown">
          登録直後に1通目をすぐ配信し、その後は8日間毎日12時にアプリの使い方をメールでお届けします。
        </p>

        <div className="mt-6 flex items-center justify-between rounded-2xl border border-tape-beige bg-tape-cream/30 p-4">
          <div className="space-y-1">
            <p className="font-semibold text-tape-brown">📧 ステップメール</p>
            <p className="text-xs text-tape-light-brown">
              毎日12時に機能紹介メールを受け取る（全8通）
            </p>
          </div>
          <button
            type="button"
            onClick={handleOnboardingEmailToggle}
            disabled={onboardingLoading}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-tape-pink focus:ring-offset-2 ${
              onboardingEmailEnabled ? "bg-tape-pink" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                onboardingEmailEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-tape-light-brown">
          ※ 配信停止後も、いつでも再開できます（再開時に1通目から再スタート）。
        </p>
      </section>

      <section className="space-y-3 rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">PASSWORD</p>
        <h2 className="text-2xl font-bold text-tape-brown">パスワード設定</h2>
        <p className="text-sm text-tape-light-brown">
          パスワードを変更すると、PC やスマートフォンなど全ての端末で新しいパスワードが必要になります。
        </p>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-tape-beige bg-tape-cream/30 p-4 text-sm text-tape-light-brown md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-tape-brown">🔒 パスワードの再設定</p>
            <p className="text-xs text-tape-light-brown">
              安全のため、定期的な変更をおすすめします。メールアドレスは変更できません。
            </p>
          </div>
          <Link href="/update-password" className="inline-flex justify-end">
            <Button className="bg-tape-pink text-tape-brown hover:bg-tape-pink/90">
              パスワードを変更する
            </Button>
          </Link>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">X (TWITTER) ACCOUNT</p>
        <h2 className="text-2xl font-bold text-tape-brown">Xアカウント連携</h2>
        <p className="text-sm text-tape-light-brown">
          「みんなの日記」をXでシェアしてポイントを獲得するには、Xアカウントの登録が必要です。
        </p>

        <form onSubmit={handleTwitterSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-tape-light-brown" htmlFor="twitterUsername">
              Xユーザー名（@なし）
            </label>
            <div className="flex items-center gap-2">
              <span className="text-tape-brown">@</span>
              <input
                id="twitterUsername"
                name="twitterUsername"
                value={twitterUsername}
                onChange={(event) => setTwitterUsername(event.target.value)}
                placeholder="username"
                className="flex-1 rounded-2xl border border-tape-beige bg-tape-cream/50 px-4 py-3 text-sm text-tape-brown focus:border-tape-pink focus:outline-none focus:ring-1 focus:ring-tape-pink disabled:opacity-50"
                maxLength={15}
                pattern="[A-Za-z0-9_]{1,15}"
                disabled={!canUpdateTwitter}
                required
              />
            </div>
            <p className="text-xs text-tape-light-brown">
              英数字とアンダースコアのみ、1〜15文字
            </p>
            {!canUpdateTwitter && (
              <p className="text-xs text-tape-pink">
                ⚠️ Xアカウントは7日間変更できません。あと{daysUntilTwitterUpdate}日後に変更可能です。
              </p>
            )}
            {twitterUpdatedAt && (
              <p className="text-xs text-tape-light-brown">
                最終更新: {new Date(twitterUpdatedAt).toLocaleString("ja-JP")}
              </p>
            )}
          </div>

          {twitterError && <p className="text-sm text-tape-pink">{twitterError}</p>}
          {twitterMessage && <p className="text-sm text-tape-green">{twitterMessage}</p>}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={twitterSubmitting || !canUpdateTwitter}
              className="bg-tape-pink text-tape-brown hover:bg-tape-pink/90 disabled:opacity-50"
            >
              {twitterSubmitting ? "更新中..." : twitterUsername ? "Xアカウントを更新" : "Xアカウントを登録"}
            </Button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl border border-tape-beige bg-tape-cream/30 p-4 text-xs text-tape-light-brown">
          <h4 className="font-semibold text-tape-brown">重要事項</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Xアカウントを登録すると、シェア時に自動的にハッシュタグ #かんじょうにっき #テープ式心理学 が追加されます</li>
            <li>不正なポイント獲得を防ぐため、アカウントの変更は<strong>7日間に1度のみ</strong>可能です</li>
            <li>シェアした投稿は管理者が定期的に確認します</li>
            <li>実際にXへ投稿せずにポイントを獲得した場合、アカウント停止の対象となります</li>
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-tape-beige bg-white/70 p-6 text-sm text-tape-light-brown">
        <h3 className="text-base font-semibold text-tape-brown">ご利用にあたって</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>ユーザー名はいつでも変更できますが、公序良俗に反する表現はご遠慮ください。</li>
          <li>アイコンは「みんなの日記」やコメント欄で表示されます。2MB以下の画像をご利用ください。</li>
          <li>変更内容の反映には数秒かかる場合があります。表示が更新されない場合はページの再読み込みをお試しください。</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-3xl border border-red-100 bg-red-50/40 p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.4em] text-red-400">ACCOUNT RESET</p>
        <h2 className="text-2xl font-bold text-tape-brown">アカウントを削除する</h2>
        <p className="text-sm text-tape-light-brown">
          全ての日記、ポイント、X連携などが完全に削除されます。削除後は復元できません。心をリセットしたいと感じたときだけご利用ください。
        </p>
        {deleteAccountError && <p className="text-sm text-tape-pink">{deleteAccountError}</p>}
        <Button
          type="button"
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50"
          onClick={handleAccountDelete}
          disabled={deletingAccount}
        >
          {deletingAccount ? "削除中..." : "全てのデータを削除する"}
        </Button>
        <p className="text-xs text-tape-light-brown">※ 一度削除すると、アカウントや日記を元に戻すことはできません。</p>
      </section>
    </div>
  );
}
