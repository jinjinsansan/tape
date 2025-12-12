"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Link as LinkIcon, Share2, X as XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SharePlatform = "copy" | "x" | "line";

type FeedShareButtonProps = {
  entryId: string;
  contentPreview: string;
  shareCount: number;
  disabled?: boolean;
  className?: string;
};

const fallbackOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

export function FeedShareButton({ entryId, contentPreview, shareCount, disabled, className }: FeedShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState(() => `${fallbackOrigin}/feed/${entryId}`.replace("//feed", "/feed"));
  const [count, setCount] = useState(shareCount);
  const [shareError, setShareError] = useState<string | null>(null);
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null);
  const [checkingTwitter, setCheckingTwitter] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setShareUrl(`${window.location.origin}/feed/${entryId}`);
  }, [entryId]);

  useEffect(() => {
    const loadTwitterProfile = async () => {
      try {
        const res = await fetch("/api/profile/twitter");
        if (res.ok) {
          const data = await res.json();
          setTwitterUsername(data.twitterUsername ?? null);
        }
      } catch (err) {
        console.error("Failed to load Twitter profile", err);
      } finally {
        setCheckingTwitter(false);
      }
    };
    loadTwitterProfile();
  }, []);

  const clippedPreview = useMemo(() => {
    if (!contentPreview) return "";
    const trimmed = contentPreview.trim();
    return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
  }, [contentPreview]);

  const recordShare = useCallback(async (platform?: SharePlatform) => {
    try {
      const res = await fetch(`/api/feed/${entryId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform })
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.shareCount === "number") {
          setCount(data.shareCount);
          return;
        }
      }
      setCount((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to record share", error);
    }
  }, [entryId]);

  const handleShare = useCallback(
    async (platform: SharePlatform) => {
      if (!shareUrl) return;
      
      // Xシェアの場合、アカウント登録チェック
      if (platform === "x" && !twitterUsername) {
        setShareError("Xでシェアするには、マイページでXアカウントを登録してください");
        return;
      }
      
      setShareError(null);
      try {
        if (platform === "copy") {
          await navigator.clipboard.writeText(shareUrl);
        } else if (platform === "x") {
          const url = new URL("https://x.com/intent/post");
          url.searchParams.set("url", shareUrl);
          // ハッシュタグを自動挿入
          const textWithHashtags = clippedPreview 
            ? `${clippedPreview}\n\n#かんじょうにっき #テープ式心理学`
            : "#かんじょうにっき #テープ式心理学";
          url.searchParams.set("text", textWithHashtags);
          window.open(url.toString(), "_blank", "noopener,noreferrer");
        } else if (platform === "line") {
          const url = new URL("https://social-plugins.line.me/lineit/share");
          url.searchParams.set("url", shareUrl);
          window.open(url.toString(), "_blank", "noopener,noreferrer");
        }

        await recordShare(platform);
        setOpen(false);
        if (platform === "copy") {
          alert("リンクをコピーしました");
        }
      } catch (error) {
        console.error("Share failed", error);
        setShareError("シェアに失敗しました。もう一度お試しください。");
      }
    },
    [shareUrl, clippedPreview, recordShare, twitterUsername]
  );

  if (disabled) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex items-center gap-2 border-tape-beige text-tape-light-brown"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Share2 className="h-4 w-4" />
        シェア
        {count > 0 && <span className="text-[11px] text-tape-brown">({count})</span>}
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-tape-beige bg-white p-4 text-sm shadow-xl">
          <p className="text-xs font-semibold text-tape-light-brown">SNSでシェア</p>
          <p className="mt-1 text-[11px] text-tape-light-brown">
            公開リンク: <span className="font-mono text-xs text-tape-brown">{shareUrl}</span>
          </p>
          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={() => handleShare("copy")}
              className="flex w-full items-center justify-between rounded-xl border border-tape-beige px-3 py-2 text-left text-sm text-tape-brown hover:bg-tape-cream"
            >
              <span className="flex items-center gap-2">
                <Copy className="h-4 w-4" /> リンクをコピー
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleShare("x")}
              disabled={!twitterUsername}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border border-tape-beige px-3 py-2 text-left text-sm text-tape-brown hover:bg-tape-cream",
                !twitterUsername && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="flex items-center gap-2">
                <XIcon className="h-4 w-4" /> Xで投稿 {!twitterUsername && "(要登録)"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleShare("line")}
              className="flex w-full items-center justify-between rounded-xl border border-tape-beige px-3 py-2 text-left text-sm text-tape-brown hover:bg-tape-cream"
            >
              <span className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" /> LINEでシェア
              </span>
            </button>
          </div>
          {shareError && <p className="mt-2 text-[11px] text-tape-pink">{shareError}</p>}
          <p className="mt-3 text-[11px] text-tape-light-brown">
            {twitterUsername 
              ? `クリップボードやSNSに共有すると、シェア回数にカウントされます。Xでシェアした場合は +5pt 付与されます（ハッシュタグ #かんじょうにっき #テープ式心理学 が自動挿入されます）`
              : "Xでシェアしてポイントを獲得するには、マイページでXアカウントを登録してください"}
          </p>
        </div>
      )}
    </div>
  );
}
