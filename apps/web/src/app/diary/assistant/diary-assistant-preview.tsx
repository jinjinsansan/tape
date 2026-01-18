"use client";

import { memo } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AssistantDraftPayload } from "@/server/services/diary-ai-assistant";

type DiaryAssistantPreviewProps = {
  draft: AssistantDraftPayload | null;
  selfEsteemScore: number | null;
  worthlessnessScore: number | null;
  loadingDraft?: boolean;
  loadingSave?: boolean;
  onSave: () => void;
  onRegenerate: () => void;
};

const Component = ({
  draft,
  selfEsteemScore,
  worthlessnessScore,
  loadingDraft,
  loadingSave,
  onSave,
  onRegenerate
}: DiaryAssistantPreviewProps) => {
  if (!draft) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-dashed border-rose-200 p-6 text-sm text-[#7a6358]">
        下書き生成中です…
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#f5e6dd] bg-white/95 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">DRAFT</p>
      <h2 className="mt-1 text-2xl font-bold text-[#5a473f]">{draft.title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#5a473f]">
        {draft.content.split("\n").map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
      </div>
      <dl className="mt-4 grid gap-3 text-xs text-[#7a6358] md:grid-cols-2">
        <div>
          <dt className="font-semibold">感情</dt>
          <dd>{draft.emotionLabel ?? "未選択"}</dd>
        </div>
        {selfEsteemScore != null && (
          <div>
            <dt className="font-semibold">自己肯定感スコア</dt>
            <dd>
              {selfEsteemScore}
              {worthlessnessScore != null && ` / 無価値感 ${worthlessnessScore}`}
            </dd>
          </div>
        )}
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="lg" className="rounded-full bg-tape-pink text-white" onClick={onSave} disabled={loadingSave}>
          {loadingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : "日記ページに下書きを送る"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-full"
          onClick={onRegenerate}
          disabled={loadingDraft}
        >
          {loadingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : "もう一度つくり直す"}
        </Button>
      </div>
    </div>
  );
};

export const DiaryAssistantPreview = memo(Component);
