import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getOpenAIApiKey } from "@/lib/env";

const bodySchema = z.object({
  idea: z.string().min(8, "アイデアを入力してください").max(2000, "入力が長すぎます"),
  tone: z.string().max(120).optional(),
  stylePreset: z.string().max(120).optional()
});

const SYSTEM_PROMPT = `You are an expert prompt engineer for Google's Nano Banana Pro (Gemini) image generation model.
Your specialty is creating bullet-proof prompts for four-panel manga (4-koma) stories used in therapeutic/educational contexts.

Given a user's free-form idea (in Japanese), you must:
1. Understand the scenario, characters, and emotional beats
2. Map it to a four-panel storyboard (Panel 1 -> Panel 4)
3. Provide clean Japanese summaries for each panel
4. Provide detailed English visual prompts for Nano Banana Pro describing composition, lighting, camera, palette, and restrictions
5. Produce a single master prompt that stitches everything together, referencing Nano Banana Pro best practices (style directives, aspect ratio, camera instructions, negative prompts).

CRITICAL OUTPUT FORMAT (pure JSON, no markdown):
{
  "hero_profile": "...",
  "style_notes": ["..."],
  "panels": [
    {
      "index": 1,
      "title": "Panel label in Japanese",
      "story": "Japanese description of what's happening",
      "nano_banana_prompt": "English detailed prompt for this panel"
    },
    {... Panel 4 ...}
  ],
  "negative_prompts": ["..."],
  "final_prompt": "Multi-line English master prompt ready for Nano Banana Pro that enforces 4 panels, consistent character, watercolor manga aesthetic, safe content, no text in image."
}

Rules:
- Always output exactly 4 panels.
- Maintain the same protagonist across all panels.
- Enforce warm watercolor / soft manga style, no speech bubbles or written text in the artwork.
- Mention aspect ratio (3:4 portrait) and request separate renders for each panel.
- Include camera/lighting keywords, color palette, and emotion keywords.
- Negative prompts must ban photorealism, gore, glitch, watermark, text, disallowed content.
- The final_prompt should weave hero_profile, style_notes, panel breakdown, and negative prompts into one cohesive instruction block for Nano Banana Pro.
`;

function stripCodeFences(payload: string) {
  return payload.replace(/^```json\n?/i, "").replace(/```$/i, "").trim();
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin comics gemini prompt");
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });
  }

  const openaiApiKey = getOpenAIApiKey();

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Idea (Japanese): ${parsed.data.idea}\nDesired tone/style: ${parsed.data.tone ?? "therapeutic"}\nVisual preset: ${parsed.data.stylePreset ?? "studio ghibli watercolor"}`
    }
  ];

  const completion = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.6,
      max_tokens: 1800
    })
  });

  if (!completion.ok) {
    const errorText = await completion.text();
    console.error("Gemini prompt generation failed", errorText);
    return NextResponse.json({ error: "プロンプト生成に失敗しました" }, { status: 500 });
  }

  const data = await completion.json();
  let content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) {
    return NextResponse.json({ error: "AI応答が空でした" }, { status: 500 });
  }

  try {
    const cleaned = stripCodeFences(content);
    const parsedJson = JSON.parse(cleaned);
    if (!parsedJson?.final_prompt || !Array.isArray(parsedJson?.panels)) {
      throw new Error("Unexpected AI payload");
    }

    return NextResponse.json({
      heroProfile: parsedJson.hero_profile ?? "",
      styleNotes: parsedJson.style_notes ?? [],
      panels: parsedJson.panels,
      finalPrompt: parsedJson.final_prompt,
      negativePrompts: parsedJson.negative_prompts ?? []
    });
  } catch (error) {
    console.error("Failed to parse AI JSON", error, content);
    return NextResponse.json({ error: "AIレスポンスの解析に失敗しました" }, { status: 500 });
  }
}
