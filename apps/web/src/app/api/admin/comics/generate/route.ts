import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getKnowledgeChunkById } from "@/server/services/knowledge";
import { buildComicsPrompt } from "@/lib/comics-prompt";
import { getNanoBananaConfig } from "@/lib/env";

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
    keyPoints: chunk.keyPoints,
    customInstructions: parsed.data.customInstructions,
    stylePreset: parsed.data.stylePreset as any
  });

  let panels: Array<{ index: number; caption?: string; imageData: string }> = [];
  try {
    const { apiUrl, apiKey } = getNanoBananaConfig();
    const endpoint = apiUrl.includes("?") ? `${apiUrl}&key=${apiKey}` : `${apiUrl}?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        panels: 4,
        aspect_ratio: "square",
        language: "ja"
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Nano Banana API error");
    }

    const data = await res.json();
    const rawPanels = data.panels ?? data.images ?? [];
    panels = rawPanels.map((panel: any, index: number) => {
      const imageData = panel.base64 ?? panel.image_base64 ?? panel.url ?? panel.imageUrl;
      if (!imageData) {
        throw new Error("Nano Banana response is missing image data");
      }
      const isUrl = typeof imageData === "string" && imageData.startsWith("http");
      return {
        index: panel.index ?? index + 1,
        caption: panel.caption ?? panel.text ?? panel.prompt ?? undefined,
        imageData: isUrl ? imageData : `data:image/png;base64,${imageData}`
      };
    });
  } catch (error) {
    console.error("Nano Banana generation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate comic" }, { status: 502 });
  }

  return NextResponse.json({ prompt, panels });
}
