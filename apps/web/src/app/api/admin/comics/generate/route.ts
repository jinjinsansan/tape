import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getKnowledgeChunkById } from "@/server/services/knowledge";
import { buildComicsPrompt } from "@/lib/comics-prompt";
import { getOpenAIApiKey } from "@/lib/env";
import { compose4KomaManga } from "@/server/services/comics-composer";

const IMAGE_GENERATION_PIPELINE = [
  { model: "dall-e-3" as const, attempts: 3 },
  { model: "gpt-image-1" as const, attempts: 2 }
];

const PLACEHOLDER_COLOR = "FFF7ED/FF8FA3";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class ImageGenerationError extends Error {
  retryable: boolean;
  status?: number;
  bodySnippet?: string;
  model: string;

  constructor(message: string, options: { retryable?: boolean; status?: number; bodySnippet?: string; model: string }) {
    super(message);
    this.name = "ImageGenerationError";
    this.retryable = options.retryable ?? false;
    this.status = options.status;
    this.bodySnippet = options.bodySnippet;
    this.model = options.model;
  }
}

type PanelImageResult = {
  imageUrl: string;
  generationSource: string;
  warning?: string;
};

function parseJsonSafe(text: string | null) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function truncateBody(text: string | null, limit = 600) {
  if (!text) return undefined;
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function shouldRetry(status: number, payload: any) {
  if (status >= 500) return true;
  const type = payload?.error?.type;
  return type === "server_error" || type === "rate_limit_exceeded";
}

function buildPlaceholderUrl(panelIndex: number) {
  const label = encodeURIComponent(`Panel ${panelIndex} unavailable`);
  return `https://placehold.co/1024x1024/${PLACEHOLDER_COLOR}?text=${label}`;
}

async function fetchImageFromModel({
  model,
  prompt,
  apiKey
}: {
  model: string;
  prompt: string;
  apiKey: string;
}) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    })
  });

  const bodyText = await res.text();
  const payload = parseJsonSafe(bodyText);

  if (!res.ok) {
    throw new ImageGenerationError(`Image API error (model ${model}, status ${res.status})`, {
      retryable: shouldRetry(res.status, payload),
      status: res.status,
      bodySnippet: truncateBody(bodyText ?? JSON.stringify(payload ?? {})),
      model
    });
  }

  const imageUrl = payload?.data?.[0]?.url;
  if (!imageUrl) {
    throw new ImageGenerationError(`Image API did not return image URL (model ${model})`, {
      retryable: false,
      status: res.status,
      bodySnippet: truncateBody(bodyText),
      model
    });
  }

  return imageUrl;
}

async function generatePanelImage({
  prompt,
  panelIndex,
  apiKey
}: {
  prompt: string;
  panelIndex: number;
  apiKey: string;
}): Promise<PanelImageResult> {
  let lastError: ImageGenerationError | null = null;

  for (const stage of IMAGE_GENERATION_PIPELINE) {
    for (let attempt = 1; attempt <= stage.attempts; attempt++) {
      try {
        const imageUrl = await fetchImageFromModel({
          model: stage.model,
          prompt,
          apiKey
        });
        const warning = stage.model !== IMAGE_GENERATION_PIPELINE[0].model
          ? `Panel ${panelIndex} used fallback model ${stage.model}.`
          : undefined;
        if (warning) {
          console.warn(warning);
        }
        return { imageUrl, generationSource: stage.model, warning };
      } catch (error) {
        const err = error instanceof ImageGenerationError
          ? error
          : new ImageGenerationError((error as Error)?.message ?? "Image generation failed", {
              retryable: false,
              model: stage.model
            });
        lastError = err;
        console.warn(
          `Panel ${panelIndex} attempt ${attempt}/${stage.attempts} failed for ${stage.model}`,
          {
            status: err.status,
            retryable: err.retryable,
            bodySnippet: err.bodySnippet
          }
        );
        if (!err.retryable) break;
        if (attempt < stage.attempts) {
          const delayMs = Math.pow(2, attempt - 1) * 2000;
          await sleep(delayMs);
        }
      }
    }
  }

  const placeholderUrl = buildPlaceholderUrl(panelIndex);
  if (lastError && !lastError.retryable) {
    throw lastError;
  }

  const warning = `Panel ${panelIndex} fell back to placeholder after repeated image generation failures.`;
  console.error(warning, lastError);
  return {
    imageUrl: placeholderUrl,
    generationSource: "placeholder",
    warning: lastError ? `${warning} Last error: ${lastError.message}` : warning
  };
}

const bodySchema = z.object({
  chunkId: z.string(),
  customInstructions: z.string().max(1200).optional(),
  stylePreset: z.string().optional()
});

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin comics generate");
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const chunk = await getKnowledgeChunkById(parsed.data.chunkId);
  if (!chunk) {
    return NextResponse.json({ error: "Chunk not found" }, { status: 404 });
  }

  const prompt = buildComicsPrompt({
    title: chunk.title,
    summary: chunk.summary,
    content: chunk.content,  // CRITICAL: Pass full content for accurate storytelling
    keyPoints: chunk.keyPoints,
    customInstructions: parsed.data.customInstructions,
    stylePreset: parsed.data.stylePreset as any
  });

  let panels: Array<{ index: number; caption?: string; imageData: string; generationSource: string; warning?: string }> = [];
  const warnings: string[] = [];
  try {
    const openaiApiKey = getOpenAIApiKey();

    // Step 1: Generate panel descriptions using OpenAI GPT-4
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a creative director for 4-panel manga (4-koma) that explains psychology concepts through Studio Ghibli-inspired illustration style.

CRITICAL REQUIREMENTS:
1. READ the full psychology content carefully and create a story that accurately reflects it
2. Do NOT create generic motivational stories - use specific details from the content
3. Choose characters (age, gender, occupation) that match who experiences this psychological issue
4. Each panel must teach a specific insight from the content
5. Use visual metaphors to show psychological mechanisms (e.g., tape covering mouth, inner child, masks, shadows)
6. Return ONLY valid JSON with no additional text or markdown formatting

Your response must be pure JSON in this exact format:
{"panels":[{"index":1,"caption":"日本語のキャプション","prompt":"Detailed English visual description"},{"index":2,"caption":"...","prompt":"..."},{"index":3,"caption":"...","prompt":"..."},{"index":4,"caption":"...","prompt":"..."}]}`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!gptRes.ok) {
      const text = await gptRes.text();
      throw new Error(`OpenAI GPT API error: ${text}`);
    }

    const gptData = await gptRes.json();
    let panelsJsonText = gptData?.choices?.[0]?.message?.content ?? "";
    if (!panelsJsonText) {
      throw new Error("GPT response did not include panel descriptions");
    }

    // Extract JSON from markdown code blocks if present
    panelsJsonText = panelsJsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const panelDescriptions = JSON.parse(panelsJsonText);
    const rawPanels = panelDescriptions.panels ?? [];
    
    if (rawPanels.length !== 4) {
      throw new Error(`Expected 4 panels, got ${rawPanels.length}`);
    }

    // Step 2: Generate images using DALL-E 3
    // Get style directives from the selected style preset
    const stylePreset = parsed.data.stylePreset || "gentle";
    const { COMIC_STYLE_PRESETS } = await import("@/lib/comics-prompt");
    const selectedStyle = COMIC_STYLE_PRESETS[stylePreset as keyof typeof COMIC_STYLE_PRESETS] || COMIC_STYLE_PRESETS.gentle;
    
    for (const panel of rawPanels) {
      const imagePrompt = panel.prompt || panel.description || "";
      const panelIndex = panel.index ?? panels.length + 1;
      if (!imagePrompt) {
        throw new Error(`Panel ${panelIndex} missing prompt/description`);
      }

      // Enhance prompt with selected style directives and NO text requirement
      const enhancedPrompt = `${selectedStyle.directives}

${imagePrompt}

CRITICAL: Absolutely NO speech bubbles, NO text, NO written words, NO Japanese characters - only pure illustration.`;
      
      const panelImage = await generatePanelImage({
        prompt: enhancedPrompt,
        panelIndex,
        apiKey: openaiApiKey
      });
      if (panelImage.warning) {
        warnings.push(panelImage.warning);
      }

      panels.push({
        index: panelIndex,
        caption: panel.caption ?? undefined,
        imageData: panelImage.imageUrl,
        generationSource: panelImage.generationSource,
        warning: panelImage.warning
      });
    }

    // Step 3: Compose into single 4-koma manga image
    const composedImageBuffer = await compose4KomaManga(
      panels.map(p => ({
        index: p.index,
        caption: p.caption,
        imageUrl: p.imageData
      }))
    );

    // Convert to base64 for response
    const base64Image = `data:image/png;base64,${composedImageBuffer.toString("base64")}`;

    return NextResponse.json({ 
      prompt, 
      panels,
      warnings,
      composedImage: base64Image
    });
  } catch (error) {
    console.error("Comics generation failed", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to generate comic" 
    }, { status: 502 });
  }
}
