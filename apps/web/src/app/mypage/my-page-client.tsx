"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type Profile = {
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
};

type MyPageClientProps = {
  initialProfile: Profile;
};

const DEFAULT_AVATAR = "https://placehold.co/120x120/F5F2EA/5C554F?text=User";
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export function MyPageClient({ initialProfile }: MyPageClientProps) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName ?? "");
  const [avatarPreview, setAvatarPreview] = useState(initialProfile.avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-3 rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
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
                  className="h-24 w-24 rounded-full object-cover border border-tape-beige"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-tape-beige bg-tape-cream text-sm text-tape-light-brown">
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
      </section>

      <section className="rounded-3xl border border-tape-beige bg-white/70 p-6 text-sm text-tape-light-brown">
        <h3 className="text-base font-semibold text-tape-brown">ご利用にあたって</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>ユーザー名はいつでも変更できますが、公序良俗に反する表現はご遠慮ください。</li>
          <li>アイコンは「みんなの日記」やコメント欄で表示されます。2MB以下の画像をご利用ください。</li>
          <li>変更内容の反映には数秒かかる場合があります。表示が更新されない場合はページの再読み込みをお試しください。</li>
        </ul>
      </section>
    </form>
  );
}
