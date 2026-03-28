/**
 * リッチメニュー画像生成スクリプト (ローカル実行)
 *
 * 使い方: node scripts/generate-richmenu-image.mjs
 * 出力: apps/line-bot/richmenu.png
 */

import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const WIDTH = 2500;
const HEIGHT = 843;
const COL_W = Math.floor(WIDTH / 3);

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext("2d");

// ── Colors ──
const CREAM = "#faf6f2";
const WARM_PINK = "#d59da9";
const WARM_PINK_LIGHT = "#e8c4cb";
const TEXT_DARK = "#51433c";
const TEXT_MID = "#8c7a70";
const WHITE = "#ffffff";
const GOLD = "#c9a96e";

// ── Helpers ──
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Background ──
ctx.fillStyle = CREAM;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// top accent bar
const topGrad = ctx.createLinearGradient(0, 0, WIDTH, 0);
topGrad.addColorStop(0, WARM_PINK);
topGrad.addColorStop(0.5, WARM_PINK_LIGHT);
topGrad.addColorStop(1, WARM_PINK);
ctx.fillStyle = topGrad;
ctx.fillRect(0, 0, WIDTH, 8);

// bottom accent bar
ctx.fillStyle = topGrad;
ctx.fillRect(0, HEIGHT - 6, WIDTH, 6);

// ── Dividers ──
ctx.strokeStyle = "rgba(213,157,169,0.2)";
ctx.lineWidth = 2;
[COL_W, COL_W * 2].forEach((x) => {
  ctx.beginPath();
  ctx.moveTo(x, 60);
  ctx.lineTo(x, HEIGHT - 60);
  ctx.stroke();
});

// ── Button definitions ──
const buttons = [
  {
    label: "DIARY",
    labelJp: "かんじょうにっき",
    sub: "感情を見つめる",
    iconColor: WARM_PINK,
    drawIcon: drawDiaryIcon,
  },
  {
    label: "MICHELLE",
    labelJp: "ミシェルAI",
    sub: "24時間カウンセリング",
    iconColor: WARM_PINK,
    drawIcon: drawMichelleIcon,
  },
  {
    label: "CONTACT",
    labelJp: "仁さんに連絡",
    sub: "相談チケット",
    iconColor: GOLD,
    drawIcon: drawContactIcon,
  },
];

buttons.forEach((btn, i) => {
  const cx = COL_W * i + COL_W / 2;

  // ── Icon circle background ──
  const iconY = 240;
  const iconR = 100;

  // Shadow
  ctx.beginPath();
  ctx.arc(cx, iconY + 4, iconR + 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(81,67,60,0.06)";
  ctx.fill();

  // White circle
  ctx.beginPath();
  ctx.arc(cx, iconY, iconR, 0, Math.PI * 2);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.strokeStyle = btn.iconColor + "40";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw icon
  btn.drawIcon(cx, iconY, btn.iconColor);

  // ── English label (small) ──
  ctx.font = '600 30px "Noto Sans JP"';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = btn.iconColor;
  ctx.letterSpacing = "4px";
  ctx.fillText(btn.label, cx, 380);
  ctx.letterSpacing = "0px";

  // ── Japanese label ──
  ctx.font = 'bold 54px "Noto Sans JP"';
  ctx.fillStyle = TEXT_DARK;
  ctx.fillText(btn.labelJp, cx, 430);

  // ── Decorative line ──
  ctx.beginPath();
  ctx.moveTo(cx - 40, 500);
  ctx.lineTo(cx + 40, 500);
  ctx.strokeStyle = btn.iconColor + "60";
  ctx.lineWidth = 2;
  ctx.stroke();

  // ── Sub text ──
  ctx.font = '400 36px "Noto Sans JP"';
  ctx.fillStyle = TEXT_MID;
  ctx.fillText(btn.sub, cx, 525);
});

// ── Icon Drawing Functions ──

function drawDiaryIcon(cx, cy, color) {
  // Book / Notebook icon
  const s = 45; // scale

  ctx.save();
  ctx.translate(cx - s, cy - s);

  // Book body
  roundRect(12, 5, 66, 80, 6);
  ctx.fillStyle = color + "18";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Spine
  ctx.beginPath();
  ctx.moveTo(26, 5);
  ctx.lineTo(26, 85);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Lines on page
  ctx.strokeStyle = color + "60";
  ctx.lineWidth = 2;
  [30, 42, 54, 66].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(35, y);
    ctx.lineTo(70, y);
    ctx.stroke();
  });

  // Heart on cover
  ctx.fillStyle = color;
  drawHeart(52, 22, 8);

  ctx.restore();
}

function drawHeart(cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.4);
  ctx.bezierCurveTo(cx - size, cy - size * 0.4, cx - size * 1.5, cy + size * 0.6, cx, cy + size * 1.4);
  ctx.bezierCurveTo(cx + size * 1.5, cy + size * 0.6, cx + size, cy - size * 0.4, cx, cy + size * 0.4);
  ctx.fill();
}

function drawMichelleIcon(cx, cy, color) {
  // Cherry blossom / flower icon
  const petalCount = 5;
  const petalR = 20;
  const dist = 22;

  ctx.save();
  ctx.translate(cx, cy);

  // Petals
  for (let i = 0; i < petalCount; i++) {
    const angle = (i * 2 * Math.PI) / petalCount - Math.PI / 2;
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;

    ctx.beginPath();
    ctx.arc(px, py, petalR, 0, Math.PI * 2);
    ctx.fillStyle = color + "35";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Center
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();

  ctx.restore();
}

function drawContactIcon(cx, cy, color) {
  // Envelope / mail icon
  const w = 80;
  const h = 56;
  const x = cx - w / 2;
  const y = cy - h / 2;

  ctx.save();

  // Envelope body
  roundRect(x, y, w, h, 8);
  ctx.fillStyle = color + "18";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Flap (V shape)
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 2);
  ctx.lineTo(cx, cy + 6);
  ctx.lineTo(x + w - 4, y + 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Small heart on envelope
  ctx.fillStyle = WARM_PINK;
  drawHeart(cx, cy + h * 0.15, 6);

  ctx.restore();
}

// ── Output ──
const buffer = canvas.toBuffer("image/png");
const outPath = resolve(__dirname, "..", "apps", "line-bot", "richmenu.png");
writeFileSync(outPath, buffer);
console.log(`✅ Generated: ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
