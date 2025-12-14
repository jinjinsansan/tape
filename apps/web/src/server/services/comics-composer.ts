import sharp from "sharp";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import path from "path";

// Register Japanese fonts (Noto Sans JP will be bundled)
// For Vercel, we'll use system fonts or bundled fonts
const FALLBACK_FONT = "sans-serif";

export type ComicPanel = {
  index: number;
  caption?: string;
  imageUrl: string;
};

const PANEL_SIZE = 512; // Each panel will be 512x512
const GRID_SIZE = 2; // 2x2 grid
const PADDING = 16; // Padding between panels
const TEXT_HEIGHT = 80; // Height reserved for caption below each panel
const TOTAL_PANEL_HEIGHT = PANEL_SIZE + TEXT_HEIGHT;

/**
 * Downloads an image from URL and returns a Buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image from ${url}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Composes 4 panels into a single 2x2 grid manga with captions
 * Returns a Buffer of the final PNG image
 */
export async function compose4KomaManga(panels: ComicPanel[]): Promise<Buffer> {
  if (panels.length !== 4) {
    throw new Error(`Expected 4 panels, got ${panels.length}`);
  }

  // Sort panels by index
  const sortedPanels = [...panels].sort((a, b) => a.index - b.index);

  // Download all images
  const imageBuffers = await Promise.all(
    sortedPanels.map(panel => downloadImage(panel.imageUrl))
  );

  // Resize images to panel size using sharp
  const resizedImages = await Promise.all(
    imageBuffers.map(async buffer => {
      return await sharp(buffer)
        .resize(PANEL_SIZE, PANEL_SIZE, { fit: "cover" })
        .toBuffer();
    })
  );

  // Create canvas for final composition
  const canvasWidth = GRID_SIZE * PANEL_SIZE + (GRID_SIZE + 1) * PADDING;
  const canvasHeight = GRID_SIZE * TOTAL_PANEL_HEIGHT + (GRID_SIZE + 1) * PADDING;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  // Fill background with white
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw each panel with caption
  for (let i = 0; i < 4; i++) {
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    const x = col * (PANEL_SIZE + PADDING) + PADDING;
    const y = row * (TOTAL_PANEL_HEIGHT + PADDING) + PADDING;

    // Load and draw panel image
    const img = await loadImage(resizedImages[i]);
    ctx.drawImage(img, x, y, PANEL_SIZE, PANEL_SIZE);

    // Draw caption if exists
    const caption = sortedPanels[i].caption;
    if (caption) {
      const textY = y + PANEL_SIZE + 10; // 10px below image
      drawCenteredText(ctx, caption, x, textY, PANEL_SIZE, TEXT_HEIGHT - 10);
    }
  }

  // Convert canvas to PNG buffer
  return canvas.toBuffer("image/png");
}

/**
 * Draws centered Japanese text with word wrapping
 */
function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
) {
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  
  // Try different font sizes to fit
  const fontSizes = [18, 16, 14, 12];
  
  for (const fontSize of fontSizes) {
    ctx.font = `${fontSize}px ${FALLBACK_FONT}`;
    
    const lines = wrapText(ctx, text, maxWidth - 20); // 20px padding on each side
    const lineHeight = fontSize * 1.4;
    const totalHeight = lines.length * lineHeight;
    
    if (totalHeight <= maxHeight) {
      // Draw each line
      const startY = y + (maxHeight - totalHeight) / 2;
      lines.forEach((line, index) => {
        ctx.fillText(line, x + maxWidth / 2, startY + index * lineHeight);
      });
      return;
    }
  }
  
  // If still doesn't fit, truncate
  ctx.font = `12px ${FALLBACK_FONT}`;
  const truncated = text.length > 40 ? text.substring(0, 37) + "..." : text;
  ctx.fillText(truncated, x + maxWidth / 2, y + maxHeight / 2);
}

/**
 * Wraps text into multiple lines
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let currentLine = "";
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines;
}
