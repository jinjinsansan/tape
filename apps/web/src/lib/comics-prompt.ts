type StylePresetKey = "gentle" | "ghibli" | "dramatic" | "comic";

export const COMIC_STYLE_PRESETS: Record<StylePresetKey, { label: string; description: string; directives: string }> = {
  gentle: {
    label: "やさしい共感",
    description: "柔らかい線と淡い色、安心感のある表情",
    directives:
      "Soft illustration style inspired by Japanese animation, gentle watercolor shading, warm natural lighting, expressive eyes, peaceful atmosphere, clean simple background with natural elements. Absolutely NO speech bubbles, NO text of any kind. Focus on facial expressions and body language to tell the story. Wholesome and therapeutic art style."
  },
  ghibli: {
    label: "ジブリ風",
    description: "スタジオジブリのような優しくて温かいアニメーション風",
    directives:
      "Studio Ghibli inspired illustration style, soft watercolor painting aesthetic, gentle character design with expressive eyes, warm natural lighting like Miyazaki films, simple peaceful backgrounds with nature elements (sky, plants, soft indoor spaces), wholesome and comforting atmosphere, hand-drawn feeling with organic shapes. Absolutely NO speech bubbles, NO text, NO written words of any kind. Character emotions shown through facial expressions and gentle gestures only."
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

// Define consistent protagonist (Ghibli-inspired design)
const PROTAGONIST_DESIGN = `The protagonist is a young Japanese woman in her late 20s with Studio Ghibli style character design:
- Shoulder-length dark brown hair with natural gentle waves
- Large expressive eyes with warm gentle gaze (Ghibli animation style)
- Wearing a simple cozy outfit: soft cream or beige sweater and comfortable pants
- Natural gentle facial features, kind and approachable expression
- Medium build with soft rounded shapes (Ghibli character proportions)
- Warm and wholesome appearance like Ghibli film heroines (Kiki, Sophie, Chihiro style)
CRITICAL: She appears in ALL FOUR PANELS with the exact same appearance, same outfit, same hairstyle.`;

const MANGA_STYLE_RULES = `CRITICAL STYLE REQUIREMENTS:
- Illustration style inspired by Studio Ghibli animation and Japanese storybook art
- Soft watercolor or gentle hand-painted aesthetic (NOT photorealistic, NOT 3D render, NOT CGI)
- Warm natural colors with soft shading and gentle lighting
- Absolutely NO speech bubbles, NO text, NO written words, NO Japanese characters - only pure visual storytelling
- Simple peaceful backgrounds: soft indoor spaces, glimpses of nature, gentle sky, minimal furniture
- Clear emotional storytelling through facial expressions, body language, and gentle gestures
- Wholesome and therapeutic atmosphere throughout all panels
- Hand-drawn organic feeling with soft rounded shapes`;

const AVOID_THESE = `CRITICAL - COMPLETELY AVOID:
- NO photorealistic style or realistic rendering
- NO 3D CGI or digital art style
- NO complex cluttered backgrounds
- NO multiple characters in one panel (only the protagonist)
- NO speech bubbles or text of any kind (not even sound effects or Japanese text)
- NO dark heavy atmosphere or harsh lighting
- NO sharp angular styles or aggressive expressions`;

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

  return `You are an award-winning Japanese four-panel manga (4-koma) artist specialized in therapy education, with a visual style inspired by Studio Ghibli's warmth and gentleness.
Create a cohesive story that explains Tape-style Psychology concepts through illustration with a wholesome, therapeutic atmosphere.

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

${AVOID_THESE}

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
