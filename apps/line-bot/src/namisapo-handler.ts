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
- "business" : 予約・申し込み・キャンセル・料金・住所・営業時間など事務的な質問や業務連絡
- "talk" : それ以外すべて（挨拶・雑談・悩み・相談・質問・感情吐き出し・テスト送信など）

1単語だけ回答してください。`;

const RESPONSE_PROMPT = `あなたはNAMIDAサポート協会の公式LINEアカウントの応答AIです。
名前は「ミシェル」です。テープ式心理学に基づく優しくて温かい対応をします。

【あなたの役割】
NAMIDAサポート協会の窓口として、訪れた人に温かく寄り添うこと。
あなたは人間のように自然に会話します。

【応答ルール】
- ユーザーのメッセージに合わせて自然に会話する
- 挨拶には挨拶で返す、質問には答える、悩みには共感する
- 「NAMIDAサポート協会は心に寄り添うケアを提供する一般社団法人です」と必要に応じて紹介する
- 短く、温かく、2〜4文で返す
- 堅すぎず、友達のように親しみやすく
- 感情的な相談・悩みの場合は共感を最優先し、アドバイスはしない
- 悩みや相談の場合は、もっと深く話したい場合はミシェルAIを案内する一文を自然に添える

【ミシェルAI案内（悩み・相談の場合のみ）】
もっとゆっくり話したい場合のみ、最後にさりげなく案内する:
「もしもっとゆっくり話したくなったら、24時間いつでも相談できるミシェルAIもあるよ 🌸
${MICHELLE_LP_URL}」

【重要】挨拶や軽い質問にはLP案内は不要。自然に会話するだけでOK。`;

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

    // talk → AIが自然に応答
    const reply = await generateResponse(userMessage);
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

async function classifyMessage(message: string): Promise<"business" | "talk"> {
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
    return "talk";
  } catch {
    return "talk";
  }
}

async function generateResponse(userMessage: string): Promise<string> {
  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: env.MICHELLE_MODEL,
    messages: [
      { role: "system", content: RESPONSE_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 400,
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
