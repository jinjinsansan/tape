"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Image as ImageIcon, RefreshCcw, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { comicStyleOptions, buildComicsPrompt } from "@/lib/comics-prompt";
import type { StyleOption } from "@/lib/comics-prompt";
import { cn } from "@/lib/utils";

type ChunkSummary = {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  relativePath: string;
};

type ChunkDetail = ChunkSummary & {
  content: string;
};

type PanelResult = {
  index: number;
  caption?: string;
  imageData: string;
  generationSource?: string;
  warning?: string;
};

type GenerateResponse = {
  prompt: string;
  panels: PanelResult[];
  composedImage?: string;
  warnings?: string[];
};

type ChunkGroup = {
  heading: string;
  items: ChunkSummary[];
};

const OTHER_HEADING = "その他";

const getHeadingFromTitle = (title: string): string => {
  const trimmed = title?.trim();
  if (!trimmed) return OTHER_HEADING;
  const normalized = trimmed[0]?.normalize("NFKC") ?? "";
  if (!normalized) return OTHER_HEADING;
  const code = normalized.charCodeAt(0);
  if (code >= 0x30a1 && code <= 0x30f6) {
    const hiragana = String.fromCharCode(code - 0x60);
    return hiragana;
  }
  if (code >= 0x3041 && code <= 0x3096) {
    return normalized;
  }
  if (/[a-zA-Z]/.test(normalized)) {
    return normalized.toUpperCase();
  }
  return OTHER_HEADING;
};

const buildChunkGroups = (list: ChunkSummary[]): ChunkGroup[] => {
  const groups: ChunkGroup[] = [];
  list.forEach((chunk) => {
    const heading = getHeadingFromTitle(chunk.title);
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup || lastGroup.heading !== heading) {
      groups.push({ heading, items: [chunk] });
    } else {
      lastGroup.items.push(chunk);
    }
  });
  return groups;
};

export function ComicsGeneratorClient() {
  type StyleKey = StyleOption["value"];
  const defaultStyle = (comicStyleOptions[0]?.value ?? "gentle") as StyleKey;
  const [query, setQuery] = useState("");
  const [chunks, setChunks] = useState<ChunkSummary[]>([]);
  const [alphabeticalChunks, setAlphabeticalChunks] = useState<ChunkSummary[]>([]);
  const [chunkGroups, setChunkGroups] = useState<ChunkGroup[]>([]);
  const [showingSearchResults, setShowingSearchResults] = useState(false);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<ChunkDetail | null>(null);
  const [chunkLoading, setChunkLoading] = useState(false);
  const [customInstructions, setCustomInstructions] = useState(
    "読者がテープ式心理学の根本原理を直感できるよう、会話と比喩で説明してください。"
  );
  const [stylePreset, setStylePreset] = useState<StyleKey>(defaultStyle);
  const [panels, setPanels] = useState<PanelResult[]>([]);
  const [composedImage, setComposedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const applyChunkList = useCallback((list: ChunkSummary[], isSearch = false) => {
    setChunks(list);
    setChunkGroups(isSearch ? [] : buildChunkGroups(list));
    groupRefs.current = {};
    setShowingSearchResults(isSearch);
  }, []);

  const fetchAllChunks = useCallback(async () => {
    setLoadingChunks(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/comics/chunks?view=all`);
      if (!res.ok) {
        throw new Error("チャンクの取得に失敗しました");
      }
      const data = (await res.json()) as { chunks: ChunkSummary[] };
      const list = data.chunks ?? [];
      setAlphabeticalChunks(list);
      applyChunkList(list, false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "チャンクの取得に失敗しました");
    } finally {
      setLoadingChunks(false);
    }
  }, [applyChunkList]);

  const searchChunks = useCallback(async (search?: string, random?: boolean) => {
    setLoadingChunks(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (random) params.set("random", "1");
      const res = await fetch(`/api/admin/comics/chunks?${params.toString()}`);
      if (!res.ok) {
        throw new Error("チャンクの取得に失敗しました");
      }
      const data = (await res.json()) as { chunks: ChunkSummary[] };
      applyChunkList(data.chunks ?? [], Boolean(search) || Boolean(random));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "チャンクの取得に失敗しました");
    } finally {
      setLoadingChunks(false);
    }
  }, [applyChunkList]);

  const handleResetView = useCallback(() => {
    if (alphabeticalChunks.length === 0) return;
    applyChunkList(alphabeticalChunks, false);
    setQuery("");
  }, [alphabeticalChunks, applyChunkList]);

  const scrollToHeading = useCallback((heading: string) => {
    const target = groupRefs.current[heading];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    fetchAllChunks();
  }, [fetchAllChunks]);

  const fetchChunkDetail = useCallback(async (chunkId: string) => {
    setChunkLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/comics/chunks/${chunkId}`);
      if (!res.ok) {
        throw new Error("チャンクの読み込みに失敗しました");
      }
      const data = (await res.json()) as { chunk: ChunkDetail };
      setSelectedChunk(data.chunk);
      setPanels([]);
      setWarnings([]);
      setComposedImage(null);
      setSuccessMessage(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "チャンクの読み込みに失敗しました");
    } finally {
      setChunkLoading(false);
    }
  }, []);

  const promptPreview = useMemo(() => {
    if (!selectedChunk) return "";
    return buildComicsPrompt({
      title: selectedChunk.title,
      summary: selectedChunk.summary,
      keyPoints: selectedChunk.keyPoints,
      customInstructions,
      stylePreset
    });
  }, [selectedChunk, customInstructions, stylePreset]);

  const handleGenerate = useCallback(async () => {
    if (!selectedChunk) return;
    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      setWarnings([]);
      const res = await fetch("/api/admin/comics/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chunkId: selectedChunk.id,
          customInstructions,
          stylePreset
        })
      });
      const payload = (await res.json()) as GenerateResponse;
      if (!res.ok) {
        throw new Error((payload as any)?.error ?? "生成に失敗しました");
      }
      setPanels(payload.panels ?? []);
      setComposedImage(payload.composedImage ?? null);
      setWarnings(payload.warnings ?? []);
      setSuccessMessage("4コマ漫画を生成しました。合成画像をダウンロードできます。");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "生成に失敗しました");
      setWarnings([]);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedChunk, customInstructions, stylePreset]);

  const handleDownloadPanel = (panel: PanelResult) => {
    const link = document.createElement("a");
    link.href = panel.imageData;
    const label = panel.caption ? panel.caption.replace(/\s+/g, "_") : `panel-${panel.index}`;
    link.download = `tape-4koma-${panel.index}-${label}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadComposed = () => {
    if (!composedImage) return;
    const link = document.createElement("a");
    link.href = composedImage;
    const title = selectedChunk?.title.replace(/\s+/g, "_").substring(0, 30) ?? "4koma";
    link.download = `tape-4koma-${title}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 md:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-pink-400">TAPE PSYCHOLOGY</p>
          <h1 className="text-3xl font-black text-slate-900">4コマ生成スタジオ</h1>
          <p className="text-sm text-slate-500">
            1300チャンクからテーマを選び、Nano Bananaでミシェル式の4コマ漫画を生成します。公開前に必ず内容を確認してください。
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">チャンクを探す</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => searchChunks(undefined, true)}
                disabled={loadingChunks}
              >
                <RefreshCcw className="mr-1 h-3.5 w-3.5" /> ランダム
              </Button>
            </div>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="例: ガムテープ, 無価値感"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (query.trim()) {
                    searchChunks(query.trim());
                  } else {
                    handleResetView();
                  }
                }}
                disabled={loadingChunks}
              >
                検索
              </Button>
            </div>
            <div className="space-y-2">
              {showingSearchResults ? (
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <p>検索結果: {chunks.length}件</p>
                  <button
                    type="button"
                    onClick={handleResetView}
                    className="text-pink-500 underline-offset-2 hover:underline"
                  >
                    全件表示に戻る
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">全チャンクを五十音順で表示しています。</p>
              )}
              {chunkGroups.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
                  {chunkGroups.map((group) => (
                    <button
                      key={`anchor-${group.heading}`}
                      type="button"
                      onClick={() => scrollToHeading(group.heading)}
                      className="rounded-full border border-slate-200 px-2 py-0.5 transition hover:border-pink-300 hover:text-pink-500"
                    >
                      {group.heading}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {loadingChunks && <p className="text-xs text-slate-400">読み込み中...</p>}
              {!loadingChunks && chunkGroups.length === 0 && (
                <p className="text-xs text-slate-400">該当するチャンクがありません。</p>
              )}
              {!loadingChunks &&
                chunkGroups.map((group) => (
                  <div
                    key={`group-${group.heading}`}
                    ref={(node) => {
                      if (node) {
                        groupRefs.current[group.heading] = node;
                      }
                    }}
                  >
                    <p className="mb-1 text-xs font-semibold text-slate-500">{group.heading}</p>
                    <div className="space-y-3">
                      {group.items.map((chunk) => (
                        <button
                          key={chunk.id}
                          onClick={() => fetchChunkDetail(chunk.id)}
                          className={cn(
                            "w-full rounded-xl border px-3 py-2 text-left transition hover:border-pink-200",
                            selectedChunk?.id === chunk.id ? "border-pink-300 bg-pink-50" : "border-slate-200"
                          )}
                        >
                          <p className="text-sm font-semibold text-slate-800">{chunk.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{chunk.summary}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-pink-400" />
                <h2 className="text-sm font-semibold text-slate-800">プロンプト & 漫画生成</h2>
              </div>

              {!selectedChunk && (
                <p className="mt-4 text-sm text-slate-500">チャンクを選択すると詳細とプロンプトが表示されます。</p>
              )}

              {selectedChunk && (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">選択中のチャンク</p>
                    <p className="text-lg font-bold text-slate-900">{selectedChunk.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{selectedChunk.summary}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-500">
                      {selectedChunk.keyPoints.slice(0, 4).map((point, idx) => (
                        <li key={`${selectedChunk.id}-kp-${idx}`}>{point}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-500">
                      スタイルプリセット
                      <select
                        value={stylePreset}
                        onChange={(event) => setStylePreset(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
                      >
                        {comicStyleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}（{option.description}）
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                      補足ディレクション
                      <textarea
                        value={customInstructions}
                        onChange={(event) => setCustomInstructions(event.target.value)}
                        rows={3}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
                      />
                    </label>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500">最終プロンプト</p>
                    <textarea
                      value={promptPreview}
                      readOnly
                      rows={10}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                    />
                  </div>

                  <Button onClick={handleGenerate} disabled={isGenerating || chunkLoading} className="w-full">
                    {isGenerating ? "生成中..." : "Nano Bananaで4コマ生成"}
                  </Button>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}
            {successMessage && <p className="text-sm text-emerald-600">{successMessage}</p>}

            {warnings.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">生成時の注意</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {warnings.map((warning, idx) => (
                    <li key={`warning-${idx}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {composedImage && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-pink-400" />
                    <h3 className="text-sm font-semibold text-slate-800">完成した4コマ漫画</h3>
                  </div>
                  <Button onClick={handleDownloadComposed} className="gap-2">
                    <Download className="h-4 w-4" />
                    ダウンロード
                  </Button>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-100">
                  <img
                    src={composedImage}
                    alt="4コマ漫画"
                    className="w-full"
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  2×2グリッドで合成され、各パネルの下にキャプションが表示されています。SNSに投稿する前に内容を確認してください。
                </p>
              </div>
            )}

            {panels.length > 0 && (
              <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">個別パネル（参考）</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {panels.map((panel) => (
                    <div key={panel.index} className="space-y-2 rounded-xl border border-slate-100 p-3">
                      <img
                        src={panel.imageData}
                        alt={`Panel ${panel.index}`}
                        className="h-auto w-full rounded-lg border border-slate-100 object-cover"
                      />
                      {panel.caption && <p className="text-xs text-slate-500">{panel.caption}</p>}
                      {panel.warning && (
                        <p className="text-[11px] text-amber-500">{panel.warning}</p>
                      )}
                      {panel.generationSource && (
                        <p className="text-[11px] text-slate-400">Source: {panel.generationSource}</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDownloadPanel(panel)}
                      >
                        <Download className="mr-1 h-3.5 w-3.5" /> パネル{panel.index}を保存
                      </Button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
