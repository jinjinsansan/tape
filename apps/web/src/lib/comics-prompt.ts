type StylePresetKey = "gentle" | "dramatic" | "comic";

export const COMIC_STYLE_PRESETS: Record<StylePresetKey, { label: string; description: string; directives: string }> = {
  gentle: {
    label: "やさしい共感",
    description: "柔らかい線と淡い色、安心感のある表情",
    directives:
      "Japanese manga illustration style with soft line art, gentle shading, warm facial expressions, simple backgrounds. NO text. Keep the tone comforting and hopeful."
  },
  dramatic: {
    label: "ドラマティック",
    description: "コントラスト強／光と影で葛藤を表現",
    directives:
      "Japanese manga illustration style with dramatic shading, strong contrasts, dynamic angles, and expressive panel composition. NO text. Highlight conflict and breakthrough moments."
  },
  comic: {
    label: "コミカル",
    description: "ポップな色とデフォルメ表情で軽快に",
    directives:
      "Japanese manga illustration style with simplified chibi-style character, exaggerated expressions, comedic visual effects. NO text. Keep the story light and accessible."
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

// Define consistent protagonist
const PROTAGONIST_DESIGN = `The protagonist is a young Japanese woman in her late 20s:
- Shoulder-length black hair with slight waves
- Wearing a simple casual outfit (light sweater and jeans)
- Expressive eyes and gentle facial features
- Medium build, average height
She appears in ALL FOUR PANELS with the exact same appearance.`;

const MANGA_STYLE_RULES = `CRITICAL STYLE REQUIREMENTS:
- Japanese manga/comic illustration style (NOT photorealistic, NOT 3D render)
- Black ink line art with subtle colors or grayscale
- NO speech bubbles, NO text, NO written words - just clean illustrations
- Simple, clean backgrounds that don't distract from the character
- Typical 4-koma manga panel composition
- Clear body language and facial expressions to convey emotion`;

const BASE_RULES = `- Output in Japanese, no romaji, no translation notes.
- 4 panels only. Each panel shows the SAME protagonist (see character design above).
- Use manga/comic illustration style, NOT photorealistic images.
- NO text or speech bubbles in the image - convey story through expressions and actions only.
- Keep visual storytelling clear and simple.
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

  return `You are an award-winning Japanese four-panel manga (4-koma) artist specialized in therapy education.
Create a cohesive story that explains Tape-style Psychology concepts through manga-style illustration and dialogue.

# Character design (USE IN ALL PANELS)
${PROTAGONIST_DESIGN}

# Theme
${title}

# Concept summary
${summary}

# Key takeaways to visualize
${keyPointSection}

# Manga style requirements
${MANGA_STYLE_RULES}

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
