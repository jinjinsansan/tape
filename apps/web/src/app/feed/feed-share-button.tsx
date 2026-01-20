"use client";

import { useCallback, useEffect, useMemo, useState, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Link as LinkIcon, Share2, X as XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildDiaryShareText } from "@/lib/diary-share";

type SharePlatform = "copy" | "x" | "line";

type FeedShareButtonProps = {
  entryId: string;
  contentPreview: string;
  shareCount: number;
  title?: string | null;
  moodLabel?: string | null;
  feelings?: string[];
  journalDate?: string | null;
  disabled?: boolean;
  className?: string;
};

const fallbackOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

export function FeedShareButton({
  entryId,
  contentPreview,
  shareCount,
  title,
  moodLabel,
  feelings,
  journalDate,
  disabled,
  className
}: FeedShareButtonProps) {
  const [open, setOpen] = useState(false);
  const sharePath = `/feed/${entryId}/share`;
  const [shareUrl, setShareUrl] = useState(() => `${fallbackOrigin}${sharePath}`.replace("//feed", "/feed"));
  const [count, setCount] = useState(shareCount);
  const [shareError, setShareError] = useState<string | null>(null);
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setShareUrl(`${window.location.origin}${sharePath}`);
  }, [entryId, sharePath]);

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
      }
    };
    loadTwitterProfile();
  }, []);

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 288; // w-72
    const padding = 16;
    const left = Math.min(Math.max(rect.left, padding), window.innerWidth - width - padding);
    const top = Math.min(rect.bottom + 8, window.innerHeight - 16);
    setPopoverPosition({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open, updatePopoverPosition]);

  const clippedPreview = useMemo(() => {
    if (!contentPreview) return "";
    const trimmed = contentPreview.trim();
    return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
  }, [contentPreview]);

  const normalizedFeelings = useMemo(() => (feelings ?? []).filter(Boolean), [feelings]);
  const feelingsKey = normalizedFeelings.join("|");

  const shareTemplate = useMemo(
    () =>
      buildDiaryShareText({
        title,
        snippet: clippedPreview,
        moodLabel,
        feelings: normalizedFeelings,
        journalDate
      }),
    [title, clippedPreview, moodLabel, journalDate, feelingsKey]
  );

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
          url.searchParams.set("text", shareTemplate);
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
    [shareUrl, shareTemplate, recordShare, twitterUsername]
  );

  const handleCopyTemplate = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl ? `${shareTemplate}\n${shareUrl}` : shareTemplate);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    } catch (error) {
      console.error("Failed to copy share template", error);
      setShareError("テンプレのコピーに失敗しました");
    }
  }, [shareTemplate, shareUrl]);

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
        ref={triggerRef}
      >
        <Share2 className="h-4 w-4" />
        シェア
        {count > 0 && <span className="text-[11px] text-tape-brown">({count})</span>}
      </Button>
      {open && isMounted && popoverPosition &&
        createPortal(
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)}>
            <div className="absolute inset-0" aria-hidden="true" />
            <div
              className="absolute w-72 rounded-2xl border border-tape-beige bg-white p-4 text-sm shadow-2xl"
              style={{ top: popoverPosition.top, left: popoverPosition.left }}
              onClick={(event) => event.stopPropagation()}
            >
          <p className="text-xs font-semibold text-tape-light-brown">SNSでシェア</p>
          <div className="mt-2 rounded-2xl border border-tape-beige/60 bg-tape-cream/30 p-3 text-[11px] text-tape-brown">
            <div className="flex items-center justify-between text-[11px] font-semibold text-tape-light-brown">
              <span>X投稿テンプレ</span>
              <button
                type="button"
                onClick={handleCopyTemplate}
                className="flex items-center gap-1 text-[11px] text-tape-pink hover:underline"
              >
                {copiedTemplate ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} コピー
              </button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-tape-brown">
              {shareTemplate}
            </pre>
            <p className="mt-2 text-[10px] text-tape-light-brown">
              テンプレを貼り付けたあと、下の公開リンクを添付すると自動的にOGPカードが表示されます。
            </p>
          </div>
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
              ? `クリップボードやSNSに共有すると、シェア回数にカウントされます。Xに投稿する際はテンプレ＋公開リンクをあわせて載せてください。`
              : "Xでシェアしてポイントを獲得するには、マイページでXアカウントを登録してください"}
          </p>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
