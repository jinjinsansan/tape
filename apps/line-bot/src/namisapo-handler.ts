/** NAMIDAサポート協会 LINE公式アカウント — AI応答ハンドラー
 *
 * 役割:
 *   ① 苦しみの吐き出し → 受け止め + ミシェルAI LP へ誘導
 *   ② 業務連絡・お問い合わせ → Telegram BOT へチケット転送（/resolve で返信）
 */

import { messagingApi, WebhookEvent } from "@line/bot-sdk";
import { getOpenAI } from "./openai.js";
import { env } from "./env.js";
import { supabase } from "./supabase.js";

const { MessagingApiClient } = messagingApi;

let client: messagingApi.MessagingApiClient | null = null;

export function getNamisapoClient(): messagingApi.MessagingApiClient {
  if (!client) {
    const token = env.NAMISAPO_LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) throw new Error("NAMISAPO_LINE_CHANNEL_ACCESS_TOKEN not set");
    client = new MessagingApiClient({ channelAccessToken: token });
  }
  return client;
}

// 「お問い合わせ」モード管理
const contactMode = new Map<string, boolean>();

const MICHELLE_LP_URL = "https://namisapo.app/michelle-lp";

const CLASSIFY_PROMPT = `ユーザーのメッセージを分類してください。以下のいずれかで回答してください（1単語のみ）:
- "emotional" : 苦しみ・悩み・愚痴・感情的な吐き出し・相談・恋愛や人間関係の悩み
- "business" : 業務連絡・事務的な質問・予約・申し込み・問い合わせ・キャンセル
- "greeting" : 挨拶・軽い雑談・ありがとう

1単語だけ回答してください。`;

const EMPATHY_PROMPT = `あなたはNAMIDAサポート協会の公式LINEアカウントの応答AIです。
名前は「ミシェル」です。テープ式心理学に基づく優しい対応をします。

【最重要ルール】
- ユーザーの苦しみを受け止めることが最優先
- 「辛かったですね」「大変でしたね」「よく話してくれましたね」など共感の言葉を必ず入れる
- 短く、温かく、2〜4文で返す
- 解決策やアドバイスは言わない
- 最後に、もっと深く話したい場合はミシェルAIを案内する一文を自然に添える

【ミシェルAI案内の例】
- 「もしもっとゆっくり話したくなったら、24時間いつでも相談できるミシェルAIもあるよ 🌸」
- 「一人で抱えなくて大丈夫。ミシェルAIならいつでもそばにいるよ」

案内URLは最後に改行して貼る: ${MICHELLE_LP_URL}`;

export async function handleNamisapoEvent(event: WebhookEvent): Promise<void> {
  if (event.type !== "message" || event.message.type !== "text") return;

  const userId = event.source.userId;
  if (!userId) return;

  const replyToken = event.replyToken;
  const userMessage = event.message.text;
  const lineClient = getNamisapoClient();

  try {
    let displayName: string | undefined;
    try {
      const profile = await lineClient.getProfile(userId);
      displayName = profile.displayName;
    } catch { /* ignore */ }

    // ローディングアニメーション表示
    await lineClient.showLoadingAnimation({ chatId: userId }).catch(() => {});

    // 「お問い合わせ」トリガー
    if (userMessage === "お問い合わせ" || userMessage === "問い合わせ") {
      contactMode.set(userId, true);
      await lineClient.replyMessage({
        replyToken,
        messages: [{
          type: "text",
          text: "事務局へのメッセージを入力してください 📩\n（次に送るメッセージが事務局に届きます。キャンセルは「やめる」と送ってね）",
        }],
      });
      return;
    }

    // 連絡モード中 → Telegramへ転送
    if (contactMode.get(userId)) {
      contactMode.delete(userId);

      if (userMessage === "やめる" || userMessage === "キャンセル") {
        await lineClient.replyMessage({
          replyToken,
          messages: [{ type: "text", text: "キャンセルしました 🌸" }],
        });
        return;
      }

      await forwardToTelegram(userId, displayName ?? "不明", userMessage, "namisapo");

      await lineClient.replyMessage({
        replyToken,
        messages: [{
          type: "text",
          text: "事務局にメッセージを送りました 📩\nお返事をお待ちくださいね。",
        }],
      });
      return;
    }

    // メッセージ分類
    const category = await classifyMessage(userMessage);

    if (category === "business") {
      // 業務連絡 → 確認してTelegram転送
      await forwardToTelegram(userId, displayName ?? "不明", userMessage, "namisapo");
      await lineClient.replyMessage({
        replyToken,
        messages: [{
          type: "text",
          text: "お問い合わせありがとうございます 🌸\n事務局に伝えましたので、お返事をお待ちくださいね。",
        }],
      });
      return;
    }

    if (category === "greeting") {
      await lineClient.replyMessage({
        replyToken,
        messages: [{
          type: "text",
          text: "こんにちは 🌸 NAMIDAサポート協会です。\n何かお困りのことがあれば、いつでも話してくださいね。",
        }],
      });
      return;
    }

    // emotional → 受け止め + LP誘導
    const reply = await generateEmpathyReply(userMessage);
    await lineClient.replyMessage({
      replyToken,
      messages: [{ type: "text", text: reply }],
    });
  } catch (error) {
    console.error("[NAMISAPO Bot] Error:", error);
    try {
      await lineClient.replyMessage({
        replyToken,
        messages: [{
          type: "text",
          text: "申し訳ございません、少しエラーが起きてしまいました 💦\nもう一度お試しください。",
        }],
      });
    } catch { /* replyToken expired */ }
  }
}

async function classifyMessage(message: string): Promise<"emotional" | "business" | "greeting"> {
  const openai = getOpenAI();
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFY_PROMPT },
        { role: "user", content: message },
      ],
      max_tokens: 10,
      temperature: 0,
    });
    const raw = res.choices[0]?.message?.content?.trim().toLowerCase() ?? "";
    if (raw.includes("business")) return "business";
    if (raw.includes("greeting")) return "greeting";
    return "emotional";
  } catch {
    return "emotional";
  }
}

async function generateEmpathyReply(userMessage: string): Promise<string> {
  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: env.MICHELLE_MODEL,
    messages: [
      { role: "system", content: EMPATHY_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });
  return res.choices[0]?.message?.content?.trim() ?? "お話聞かせてくれてありがとう 🌸";
}

async function forwardToTelegram(
  lineUserId: string,
  displayName: string,
  message: string,
  source: string,
): Promise<void> {
  const { data: ticket } = await supabase
    .from("line_contact_tickets")
    .insert({
      session_id: null,
      line_user_id: lineUserId,
      display_name: displayName,
      message,
      source,
    })
    .select("id")
    .single();

  const ticketId = ticket?.id ?? "?";

  const telegramMsg =
    `📩 <b>[${source.toUpperCase()}] お問い合わせ #${ticketId}</b>\n\n` +
    `👤 ${displayName}\n` +
    `💬 「${message}」\n\n` +
    `/resolve_namisapo ${ticketId} ここに返信テキスト`;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  if (!botToken || !chatId) return;

  for (let i = 0; i < 3; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: telegramMsg, parse_mode: "HTML" }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      break;
    } catch {
      if (i < 2) await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

/** Telegram /resolve_namisapo からの返信をLINEに送信 */
export async function replyToNamisapoUser(userId: string, message: string): Promise<void> {
  const lineClient = getNamisapoClient();
  await lineClient.pushMessage({
    to: userId,
    messages: [{ type: "text", text: `📩 事務局からの返信:\n\n${message}` }],
  });
}
