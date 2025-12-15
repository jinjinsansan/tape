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
  content?: string;  // Full chunk content for accurate storytelling (optional for preview)
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

// Character design guidelines (flexible based on content)
const CHARACTER_DESIGN_GUIDELINES = `Character design requirements:
- Design characters that fit the psychological concept being explained
- Can be male, female, child, teen, adult, or elderly depending on what best illustrates the concept
- Use Studio Ghibli style character design: expressive eyes, gentle features, soft rounded shapes
- Character should wear appropriate clothing for the scenario (work clothes, casual, school uniform, etc.)
- Same character must appear consistently across ALL FOUR PANELS with same appearance
- Multiple characters allowed if the concept requires showing relationships or interactions
- Character design should match the emotional tone of the psychological concept

Examples:
- For workplace stress → office worker in business casual
- For childhood trauma → child or teen character  
- For elderly care → older adult character
- For parenting issues → parent with child
- For general self-help → young adult (20s-30s)

CRITICAL: Choose characters that authentically represent the people who experience this psychological issue.`;

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
  content = "",
  keyPoints = [],
  customInstructions,
  stylePreset = "gentle"
}: ComicsPromptInput) => {
  const style = COMIC_STYLE_PRESETS[stylePreset] ?? COMIC_STYLE_PRESETS.gentle;
  const keyPointSection = keyPoints.length
    ? keyPoints.map((point, idx) => `${idx + 1}. ${point}`).join("\n")
    : "1. 核心となるテープ式心理学の視点を簡潔に描写してください。";

  const extra = customInstructions?.trim() ? `\n# Additional director notes\n${customInstructions.trim()}` : "";

  // Truncate content if too long (keep first 2000 chars for token efficiency)
  const contentSection = content && content.length > 2000 
    ? content.slice(0, 2000) + "..."
    : content;

  return `You are an award-winning Japanese four-panel manga (4-koma) artist specialized in therapy education, with a visual style inspired by Studio Ghibli's warmth and gentleness.

CRITICAL MISSION: Read the full psychology content below and create a 4-panel manga that accurately teaches this specific concept. Do NOT create a generic story - use the actual details, examples, and insights from the content.

# Theme
${title}
${contentSection ? `
# Full Content (READ THIS CAREFULLY - This is what you must visualize)
${contentSection}
` : ""}
# Concept summary
${summary}

# Key takeaways to visualize
${keyPointSection}

# Character design guidelines
${CHARACTER_DESIGN_GUIDELINES}

# Manga style requirements
${MANGA_STYLE_RULES}

${AVOID_THESE}

# Visual style directives (${style.label})
${style.directives}

# Panel directions
${PANEL_GUIDE}

IMPORTANT INSTRUCTIONS:
1. READ THE FULL CONTENT ABOVE - This contains the specific psychology concepts, examples, and explanations you must visualize
2. Create a story that directly reflects the content, not a generic interpretation
3. Use specific details from the content (e.g., if it mentions "workplace", show a workplace; if it mentions "childhood", show a child)
4. Choose character age/gender/occupation that matches who experiences this psychological issue
5. Each panel must teach a specific insight from the content
6. Make the psychological mechanism visible through visual metaphors (e.g., tape, masks, inner child, shadows)

# Production rules
${BASE_RULES}${extra}`;
};

export type StyleOption = { value: StylePresetKey; label: string; description: string };

export const comicStyleOptions: StyleOption[] = Object.entries(COMIC_STYLE_PRESETS).map(([value, preset]) => ({
  value: value as StylePresetKey,
  label: preset.label,
  description: preset.description
}));
