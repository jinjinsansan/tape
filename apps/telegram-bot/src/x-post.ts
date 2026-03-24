/** X自動投稿 — node-cronでスケジュール実行 */

import cron from "node-cron";
import crypto from "crypto";
import { getOpenAI } from "./openai.js";
import { supabase } from "./supabase.js";
import { env } from "./env.js";
import { QUOTES, type Quote, formatQuote } from "./quotes.js";

// ── 名言選択（過去7日重複回避） ─────────────────

async function getRandomQuote(): Promise<Quote | null> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentLogs } = await supabase
    .from("x_post_logs")
    .select("quote_id")
    .gte("posted_at", sevenDaysAgo)
    .eq("status", "posted");

  const usedIds = new Set(recentLogs?.map((r) => r.quote_id) ?? []);
  const available = QUOTES.filter((q) => !usedIds.has(q.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// ── 投稿文生成（OpenAI） ────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  worthless: "無価値観",
  lonely: "寂しさ",
  fear: "恐怖",
  anger: "怒り",
  sadness: "悲しみ",
  guilt: "罪悪感",
};

async function generatePostText(quote: Quote): Promise<{ postBody: string; hashtags: string[]; fullText: string }> {
  const sourceText = quote.character ? `${quote.source} / ${quote.character}` : quote.source;

  const prompt = `あなたはX（旧Twitter）の心理系アカウントの投稿ライターです。
以下の名言をベースに、心に刺さるX投稿文を1つ作成してください。

【名言】「${quote.text}」— ${sourceText}
【テーマ】${CATEGORY_LABELS[quote.category]}を感じている人に刺さる名言です。

【最重要ルール】
★ 投稿全文（本文＋ハッシュタグ＋改行すべて含む）を必ず140文字以内にすること！
★ 日本語のXは140文字が上限です。絶対に超えないでください。

【ルール】
1. 冒頭に名言を「」付きで引用し、作品名を記載
2. 改行して心理的な一言コメント（1〜2行、簡潔に）
3. 「テープ式心理学」「ミシェル」などの固有名詞は出さない
4. 柔らかく、押しつけがましくないトーンで

【ハッシュタグ】以下から2〜3個だけ選択（文字数節約）：
#心理学 #名言 #アニメ名言 #自己肯定感 #心が楽になる #メンタルヘルス

【出力形式】JSONのみ：
{ "postBody": "投稿全文（ハッシュタグ込みで140文字以内）" }`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.8,
    max_tokens: 512,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as { postBody: string; hashtags?: string[] };
  // postBodyにハッシュタグ込みで140文字以内が入っている
  let fullText = parsed.postBody;
  // 念のため140文字に切り詰め
  if (fullText.length > 140) {
    fullText = fullText.substring(0, 140);
  }
  const hashtags = parsed.hashtags ?? [];
  return { postBody: parsed.postBody, hashtags, fullText };
}

// ── X API投稿（OAuth 1.0a） ────────────────────

/** X APIに投稿（tsx/esbuildのfetch互換性問題を回避するためchild_processで実行） */
async function postToX(text: string): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  const { execSync, execFileSync } = await import("child_process");
  const { writeFileSync, unlinkSync } = await import("fs");
  const { join } = await import("path");

  const tmpFile = join("/tmp", `x-post-${Date.now()}.cjs`);

  const script = [
    'const crypto = require("crypto");',
    `const ck = ${JSON.stringify(env.X_API_KEY)};`,
    `const cs = ${JSON.stringify(env.X_API_SECRET)};`,
    `const at = ${JSON.stringify(env.X_ACCESS_TOKEN)};`,
    `const ts = ${JSON.stringify(env.X_ACCESS_TOKEN_SECRET)};`,
    `const text = ${JSON.stringify(text)};`,
    'const url = "https://api.twitter.com/2/tweets";',
    "function pct(s) { return encodeURIComponent(s).replace(/[!\\x27()*]/g, c => \"%\" + c.charCodeAt(0).toString(16).toUpperCase()); }",
    'const p = { oauth_consumer_key: ck, oauth_nonce: crypto.randomBytes(16).toString("hex"), oauth_signature_method: "HMAC-SHA1", oauth_timestamp: Math.floor(Date.now()/1000).toString(), oauth_token: at, oauth_version: "1.0" };',
    'const ps = Object.keys(p).sort().map(k => pct(k)+"="+pct(p[k])).join("&");',
    'const sb = "POST&" + pct(url) + "&" + pct(ps);',
    'const sk = pct(cs) + "&" + pct(ts);',
    'p.oauth_signature = crypto.createHmac("sha1", sk).update(sb).digest("base64");',
    "const ah = \"OAuth \" + Object.keys(p).sort().map(k => pct(k) + '=\"' + pct(p[k]) + '\"').join(\", \");",
    'fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: ah }, body: JSON.stringify({text}) })',
    '.then(async r => { const b = await r.text(); console.log(JSON.stringify({status:r.status,body:b})); })',
    '.catch(e => { console.log(JSON.stringify({status:0,body:e.message})); });',
  ].join("\n");

  try {
    writeFileSync(tmpFile, script, "utf-8");
    const output = execFileSync("node", [tmpFile], {
      timeout: 30000,
      encoding: "utf-8",
      env: { PATH: process.env.PATH },
    }).trim();
    unlinkSync(tmpFile);

    const result = JSON.parse(output) as { status: number; body: string };

    if (result.status === 201) {
      const data = JSON.parse(result.body) as { data: { id: string } };
      return { success: true, tweetId: data.data.id };
    }
    return { success: false, error: result.body };
  } catch (error) {
    try { unlinkSync(tmpFile); } catch {}
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ── Telegram通知 ────────────────────────────────

async function notifyTelegram(message: string): Promise<void> {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  if (!botToken || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("[X Post Notify] Failed:", e);
  }
}

// ── メインフロー ────────────────────────────────

function getCronSlot(): string {
  const jstHour = (new Date().getUTCHours() + 9) % 24;
  if (jstHour >= 6 && jstHour < 10) return "morning";
  if (jstHour >= 11 && jstHour < 14) return "noon";
  return "night";
}

async function executeXPost(): Promise<void> {
  const slot = getCronSlot();
  const slotLabel = { morning: "☀️ 朝7時", noon: "🌞 昼12時", night: "🌙 夜21時" }[slot] ?? slot;

  console.log(`[X Auto Post] Cron triggered: slot=${slot}`);

  try {
    const quote = await getRandomQuote();
    if (!quote) {
      const msg = `❌ <b>X自動投稿失敗</b> ${slotLabel}\n\n利用可能な名言がありません`;
      await notifyTelegram(msg);
      return;
    }

    console.log(`[X Auto Post] Selected: ${quote.id} - ${quote.text.substring(0, 30)}...`);

    const generated = await generatePostText(quote);
    console.log(`[X Auto Post] Generated: ${generated.fullText.substring(0, 50)}...`);

    const result = await postToX(generated.fullText);

    // ログ保存
    await supabase.from("x_post_logs").insert({
      quote_id: quote.id,
      quote_text: quote.text,
      quote_source: quote.source,
      quote_character: quote.character ?? null,
      post_body: generated.fullText,
      hashtags: generated.hashtags,
      category: quote.category,
      status: result.success ? "posted" : "failed",
      x_post_id: result.tweetId ?? null,
      error_message: result.error ?? null,
      cron_slot: slot,
    });

    if (result.success) {
      const msg = `✅ <b>X自動投稿成功</b> ${slotLabel}\n\n「${quote.text}」\n— ${quote.source}\n\n🔗 https://x.com/i/web/status/${result.tweetId}`;
      await notifyTelegram(msg);
      console.log(`[X Auto Post] Success: ${result.tweetId}`);
    } else {
      const msg = `❌ <b>X自動投稿失敗</b> ${slotLabel}\n\nエラー: ${result.error}`;
      await notifyTelegram(msg);
      console.error(`[X Auto Post] Failed: ${result.error}`);
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[X Auto Post] Error: ${errMsg}`);
    await notifyTelegram(`❌ <b>X自動投稿エラー</b> ${slotLabel}\n\n${errMsg}`);
  }
}

// ── Cronスケジュール登録 ─────────────────────────

export function startXPostCron(): void {
  // JST 7:00 = UTC 22:00
  cron.schedule("0 22 * * *", () => {
    console.log("[X Auto Post] Morning cron fired");
    executeXPost();
  });

  // JST 12:00 = UTC 3:00
  cron.schedule("0 3 * * *", () => {
    console.log("[X Auto Post] Noon cron fired");
    executeXPost();
  });

  // JST 21:00 = UTC 12:00
  cron.schedule("0 12 * * *", () => {
    console.log("[X Auto Post] Night cron fired");
    executeXPost();
  });

  console.log("📮 X Auto Post cron scheduled (7:00/12:00/21:00 JST)");
}

// テスト用エクスポート
export { executeXPost };
