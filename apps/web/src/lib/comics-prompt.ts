type StylePresetKey = "gentle" | "dramatic" | "comic";

export const COMIC_STYLE_PRESETS: Record<StylePresetKey, { label: string; description: string; directives: string }> = {
  gentle: {
    label: "やさしい共感",
    description: "柔らかい線と淡い色、安心感のある表情",
    directives:
      "Use soft pastel colors, rounded line art, warm facial expressions, and gentle typographic sound effects. Keep the tone comforting and hopeful."
  },
  dramatic: {
    label: "ドラマティック",
    description: "コントラスト強／光と影で葛藤を表現",
    directives:
      "Use cinematic lighting, strong contrasts, dynamic angles, and expressive panel transitions to highlight conflict and breakthrough moments."
  },
  comic: {
    label: "コミカル",
    description: "ポップな色とデフォルメ表情で軽快に",
    directives:
      "Use bold pop colors, chibi proportions, comedic timing, and playful lettering to keep the story light and accessible."
  }
};

export type ComicsPromptInput = {
  title: string;
  summary: string;
  keyPoints?: string[];
  customInstructions?: string;
  stylePreset?: StylePresetKey;
};

const PANEL_GUIDE = `Panel 1: Show the protagonist's current misunderstanding or automatic thought. Use a relatable daily-life scene.
Panel 2: Visualize the emotional or bodily strain that the misunderstanding creates. Highlight internal dialogue.
Panel 3: Introduce the Tape-style psychological insight (ガムテープや「私」の構造など) as a turning point. Personify key concepts if helpful.
Panel 4: Depict the new perspective or action step with hope and calm body language. Include a concise reflective caption.

For each panel, provide:
- "caption": Short Japanese caption/dialogue for the panel
- "prompt": Detailed English visual description for DALL-E image generation (include character appearance, setting, mood, composition, style)`;

const BASE_RULES = `- Output in Japanese, no romaji, no translation notes.
- 4 panels only. Each panel needs a short onomatopoeia or caption that fits the scene.
- Keep characters consistent across panels (hair, outfit, colors).
- Prefer medium shots for clarity; reserve one close-up for emotional emphasis.
- Avoid gore, violence, or suggestive imagery.
- Convey empathy and practical action, not generic motivational phrases.`;

export const buildComicsPrompt = ({
  title,
  summary,
  keyPoints = [],
  customInstructions,
  stylePreset = "gentle"
}: ComicsPromptInput) => {
  const style = COMIC_STYLE_PRESETS[stylePreset] ?? COMIC_STYLE_PRESETS.gentle;
  const keyPointSection = keyPoints.length
    ? keyPoints.map((point, idx) => `${idx + 1}. ${point}`).join("\n")
    : "1. 核心となるテープ式心理学の視点を簡潔に描写してください。";

  const extra = customInstructions?.trim() ? `\n# Additional director notes\n${customInstructions.trim()}` : "";

  return `You are an award-winning four-panel manga artist specialized in therapy education.
Create a cohesive story that explains Tape-style Psychology concepts through metaphor and dialogue.

# Theme
${title}

# Concept summary
${summary}

# Key takeaways to visualize
${keyPointSection}

# Visual style directives
${style.directives}

# Panel directions
${PANEL_GUIDE}

# Production rules
${BASE_RULES}${extra}`;
};

export type StyleOption = { value: StylePresetKey; label: string; description: string };

export const comicStyleOptions: StyleOption[] = Object.entries(COMIC_STYLE_PRESETS).map(([value, preset]) => ({
  value: value as StylePresetKey,
  label: preset.label,
  description: preset.description
}));
