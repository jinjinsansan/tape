import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getKnowledgeChunkById } from "@/server/services/knowledge";
import { buildComicsPrompt } from "@/lib/comics-prompt";
import { getOpenAIApiKey } from "@/lib/env";

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
            content: "You are a creative director for 4-panel manga that explains psychology concepts. Return only valid JSON, no additional text."
          },
          {
            role: "user",
            content: `${prompt}\n\nReturn ONLY valid JSON in this exact format:\n{"panels":[{"index":1,"caption":"日本語のキャプション","prompt":"Detailed English visual description for DALL-E"},{"index":2,"caption":"...","prompt":"..."},{"index":3,"caption":"...","prompt":"..."},{"index":4,"caption":"...","prompt":"..."}]}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2048
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
    const characterConsistency = `The main character is a young Japanese woman in her late 20s with shoulder-length black wavy hair, wearing a light sweater and jeans. She has expressive eyes and gentle facial features.`;
    
    for (const panel of rawPanels) {
      const imagePrompt = panel.prompt || panel.description || "";
      if (!imagePrompt) {
        throw new Error(`Panel ${panel.index} missing prompt/description`);
      }

      // Enhance prompt with manga style and character consistency
      const enhancedPrompt = `Japanese 4-koma manga illustration style with clean black ink line art and subtle colors. Include speech bubbles or thought bubbles with Japanese text. ${characterConsistency} ${imagePrompt}`;

      const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: enhancedPrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          style: "vivid"
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
