import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getKnowledgeChunkById } from "@/server/services/knowledge";
import { buildComicsPrompt } from "@/lib/comics-prompt";
import { getGeminiConfig, getOpenAIApiKey } from "@/lib/env";

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
    // Step 1: Generate panel descriptions using Gemini
    const { apiUrl, apiKey } = getGeminiConfig();
    const endpoint = apiUrl.includes("?") ? `${apiUrl}&key=${apiKey}` : `${apiUrl}?key=${apiKey}`;
    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${prompt}\n\nReturn ONLY valid JSON in this exact format:\n{"panels":[{"index":1,"caption":"日本語のキャプション","prompt":"Detailed English visual description for DALL-E"},{"index":2,"caption":"...","prompt":"..."},{"index":3,"caption":"...","prompt":"..."},{"index":4,"caption":"...","prompt":"..."}]}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    });

    if (!geminiRes.ok) {
      const text = await geminiRes.text();
      throw new Error(`Gemini API error: ${text}`);
    }

    const geminiData = await geminiRes.json();
    const candidates = geminiData?.candidates ?? [];
    let panelsJsonText = candidates[0]?.content?.parts?.[0]?.text ?? "";
    if (!panelsJsonText) {
      throw new Error("Gemini response did not include panel descriptions");
    }

    // Extract JSON from markdown code blocks if present
    panelsJsonText = panelsJsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const panelDescriptions = JSON.parse(panelsJsonText);
    const rawPanels = panelDescriptions.panels ?? [];
    
    if (rawPanels.length !== 4) {
      throw new Error(`Expected 4 panels, got ${rawPanels.length}`);
    }

    // Step 2: Generate images using DALL-E 3
    const openaiApiKey = getOpenAIApiKey();
    
    for (const panel of rawPanels) {
      const imagePrompt = panel.prompt || panel.description || "";
      if (!imagePrompt) {
        throw new Error(`Panel ${panel.index} missing prompt/description`);
      }

      const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard"
        })
      });

      if (!dalleRes.ok) {
        const text = await dalleRes.text();
        throw new Error(`DALL-E API error for panel ${panel.index}: ${text}`);
      }

      const dalleData = await dalleRes.json();
      const imageUrl = dalleData?.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error(`DALL-E did not return image URL for panel ${panel.index}`);
      }

      panels.push({
        index: panel.index ?? panels.length + 1,
        caption: panel.caption ?? undefined,
        imageData: imageUrl
      });
    }
  } catch (error) {
    console.error("Comics generation failed", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to generate comic" 
    }, { status: 502 });
  }

  return NextResponse.json({ prompt, panels });
}
