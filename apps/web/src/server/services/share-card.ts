import { createCanvas } from "@napi-rs/canvas";

import { SITE_NAME_JP, SHARE_HASHTAG } from "@/lib/branding";

type DiaryShareCardPayload = {
  title?: string | null;
  content: string;
  moodLabel?: string | null;
  feelings?: string[];
  journalDate?: string | null;
  authorName?: string | null;
};

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;
const CONTENT_MAX_LENGTH = 180;

const clampContent = (value: string): string => {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= CONTENT_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, CONTENT_MAX_LENGTH)}…`;
};

const wrapLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const words = text.split("");
  const lines: string[] = [];
  let current = "";

  words.forEach((char) => {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines;
};

const formatShareDate = (value?: string | null): string => {
  if (!value) return "今日の記録";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "今日の記録";
  }
  return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日`;
};

export const generateDiaryShareCard = async ({
  title,
  content,
  moodLabel,
  feelings,
  journalDate,
  authorName
}: DiaryShareCardPayload): Promise<Buffer> => {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, "#fff8f0");
  gradient.addColorStop(1, "#fbe4ee");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Card container
  const cardX = 80;
  const cardY = 60;
  const cardWidth = CANVAS_WIDTH - cardX * 2;
  const cardHeight = CANVAS_HEIGHT - cardY * 2;
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.strokeStyle = "#f4c7d9";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 32);
  ctx.fill();
  ctx.stroke();

  // Header
  ctx.fillStyle = "#a44c74";
  ctx.font = "bold 42px 'Noto Sans JP', sans-serif";
  ctx.fillText(SITE_NAME_JP, cardX + 48, cardY + 70);

  ctx.font = "24px 'Noto Sans JP', sans-serif";
  ctx.fillStyle = "#c06583";
  ctx.fillText(formatShareDate(journalDate), cardX + 48, cardY + 112);

  // Title
  const titleText = title?.trim() || "(タイトルなし)";
  ctx.fillStyle = "#3a2f2f";
  ctx.font = "bold 50px 'Noto Sans JP', sans-serif";
  const clippedTitle = titleText.length > 22 ? `${titleText.slice(0, 22)}…` : titleText;
  ctx.fillText(clippedTitle, cardX + 48, cardY + 180);

  // Mood pill
  if (moodLabel) {
    ctx.fillStyle = "#ffe6ef";
    ctx.strokeStyle = "#f4b1c9";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cardX + 48, cardY + 205, 220, 44, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#b24c71";
    ctx.font = "22px 'Noto Sans JP', sans-serif";
    ctx.fillText(moodLabel, cardX + 78, cardY + 236);
  }

  // Content block
  const bodyX = cardX + 48;
  const bodyY = cardY + 280;
  const bodyWidth = cardWidth - 96;
  const bodyHeight = 220;
  ctx.fillStyle = "#fff8fb";
  ctx.strokeStyle = "#f6cedc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bodyX, bodyY, bodyWidth, bodyHeight, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#c06583";
  ctx.font = "20px 'Noto Sans JP', sans-serif";
  ctx.fillText("📝 今日の一言", bodyX + 24, bodyY + 40);

  const snippet = clampContent(content);
  ctx.fillStyle = "#4a3d3d";
  ctx.font = "26px 'Noto Sans JP', sans-serif";
  const lines = wrapLines(ctx, snippet, bodyWidth - 48);
  const lineHeight = 34;
  lines.slice(0, 5).forEach((line, index) => {
    ctx.fillText(line, bodyX + 24, bodyY + 80 + index * lineHeight);
  });

  // Feeling tags
  const feelingLabels = (feelings ?? []).filter(Boolean).slice(0, 4);
  if (feelingLabels.length > 0) {
    ctx.fillStyle = "#c06583";
    ctx.font = "20px 'Noto Sans JP', sans-serif";
    ctx.fillText("🎐 感情タグ", bodyX, cardY + cardHeight - 130);

    const chipStartY = cardY + cardHeight - 110;
    let currentX = bodyX;
    const chipPaddingX = 18;

    ctx.font = "22px 'Noto Sans JP', sans-serif";
    feelingLabels.forEach((label) => {
      const chipTextWidth = ctx.measureText(label).width;
      const chipWidth = chipTextWidth + chipPaddingX * 2;
      ctx.fillStyle = "#ffe1ec";
      ctx.beginPath();
      ctx.roundRect(currentX, chipStartY, chipWidth, 44, 22);
      ctx.fill();
      ctx.fillStyle = "#a24569";
      ctx.fillText(label, currentX + chipPaddingX, chipStartY + 30);
      currentX += chipWidth + 16;
    });
  }

  // Footer
  ctx.fillStyle = "#c06583";
  ctx.font = "20px 'Noto Sans JP', sans-serif";
  ctx.fillText(authorName ? `written by ${authorName}` : "匿名の日記", bodyX, cardY + cardHeight - 30);
  ctx.textAlign = "right";
  ctx.fillText(SHARE_HASHTAG, cardX + cardWidth - 48, cardY + cardHeight - 30);

  return canvas.toBuffer("image/png");
};
