/**
 * ミシェルAI LINE Bot — リッチメニュー登録スクリプト
 *
 * 使い方: npx tsx src/setup-richmenu.ts
 *
 * 事前に生成済み richmenu.png (2500x843) を
 * LINE Messaging API で登録・デフォルト設定する。
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { env } from "./env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKEN = env.LINE_CHANNEL_ACCESS_TOKEN;
const API = "https://api.line.me/v2/bot";

const WIDTH = 2500;
const HEIGHT = 843;

// ── LINE API 操作 ─────────────────────

async function createRichMenu(): Promise<string> {
  const colW = Math.floor(WIDTH / 3);

  const body = {
    size: { width: WIDTH, height: HEIGHT },
    selected: true,
    name: "ミシェルAI メインメニュー",
    chatBarText: "メニュー",
    areas: [
      {
        bounds: { x: 0, y: 0, width: colW, height: HEIGHT },
        action: { type: "uri", uri: "https://namisapo.app/diary" },
      },
      {
        bounds: { x: colW, y: 0, width: colW, height: HEIGHT },
        action: { type: "uri", uri: "https://namisapo.app/michelle-lp" },
      },
      {
        bounds: { x: colW * 2, y: 0, width: WIDTH - colW * 2, height: HEIGHT },
        action: { type: "message", text: "仁さんに連絡したい" },
      },
    ],
  };

  const res = await fetch(`${API}/richmenu`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create rich menu: ${res.status} ${err}`);
  }

  const data = await res.json();
  console.log("✅ Rich menu created:", data.richMenuId);
  return data.richMenuId;
}

async function uploadImage(richMenuId: string, imageBuffer: Buffer): Promise<void> {
  const res = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "image/png",
      },
      body: imageBuffer,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to upload image: ${res.status} ${err}`);
  }
  console.log("✅ Image uploaded");
}

async function setDefault(richMenuId: string): Promise<void> {
  const res = await fetch(`${API}/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to set default: ${res.status} ${err}`);
  }
  console.log("✅ Set as default rich menu");
}

async function deleteOldMenus(): Promise<void> {
  const res = await fetch(`${API}/richmenu/list`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) return;

  const data = await res.json();
  for (const menu of data.richmenus ?? []) {
    await fetch(`${API}/richmenu/${menu.richMenuId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    console.log(`🗑️ Deleted old menu: ${menu.richMenuId}`);
  }
}

// ── Main ─────────────────────

async function main() {
  const imagePath = resolve(__dirname, "..", "richmenu.png");
  console.log("📂 Loading image:", imagePath);
  const image = readFileSync(imagePath);

  console.log("🗑️ Cleaning up old menus...");
  await deleteOldMenus();

  console.log("📝 Creating rich menu...");
  const menuId = await createRichMenu();

  console.log("📤 Uploading image...");
  await uploadImage(menuId, image);

  console.log("🔗 Setting as default...");
  await setDefault(menuId);

  console.log("\n🌸 Done! Rich menu is now active.");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
