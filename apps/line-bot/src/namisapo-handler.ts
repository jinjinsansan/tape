/** NAMIDAサポート協会 LINE公式アカウント — AI応答ハンドラー
 *
 * 全メッセージにAIが応答 + クイックリプライボタン常時表示
 * 「お問い合わせ」ボタン → 連絡モード → Telegram転送
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

// 連絡モード管理
const contactMode = new Map<string, boolean>();

const MICHELLE_LP_URL = "https://namisapo.app/michelle-lp";
const KANJOU_URL = "https://namisapo.app/diary";
const LIVE_URL = "https://namisapo.app/live";

// クイックリプライボタン（全返信に付与）
const QUICK_REPLY_ITEMS: messagingApi.QuickReplyItem[] = [
  {
    type: "action",
    action: { type: "message", label: "🌿 吐き出す", text: "話を聞いてほしい" },
  },
  {
    type: "action",
    action: { type: "uri", label: "📓 かんじょうにっき", uri: KANJOU_URL },
  },
  {
    type: "action",
    action: { type: "uri", label: "📺 ライブ勉強会", uri: LIVE_URL },
  },
  {
    type: "action",
    action: { type: "message", label: "📩 お問い合わせ", text: "お問い合わせ" },
  },
];

const SYSTEM_PROMPT = `あなたはNAMIDAサポート協会の公式LINEアカウントの応答AIです。
名前は「ミシェル」です。テープ式心理学に基づく優しくて温かい対応をします。

【あなたの役割】
NAMIDAサポート協会の窓口として、訪れた人に温かく寄り添うこと。

【応答ルール】
- ユーザーのメッセージに合わせて自然に会話する
- 挨拶には挨拶で返す、質問には答える、悩みには共感する
- 短く、温かく、2〜4文で返す
- 堅すぎず、友達のように親しみやすく
- 感情的な相談・悩みの場合は共感を最優先し、アドバイスはしない

【NAMIDAサポート協会について聞かれたら】
- 一般社団法人NAMIDAサポート協会は「テープ式心理学」を使って心に寄り添うケアを提供する団体です
- 毎週月曜20:00に無料ライブ勉強会をYouTubeで配信しています
- 「かんじょうにっき」というWebアプリで感情を整理できます
- 「ミシェルAI」というAI心理カウンセラーがLINEで24時間相談に乗ります

【悩み・相談・吐き出しの場合】
- まず共感で受け止める（「辛かったね」「それは大変だったね」）
- 最後に自然にミシェルAIを案内する:
「もっとゆっくり話したくなったら、ミシェルAIがいつでも相談に乗るよ 🌸
${MICHELLE_LP_URL}」

【お問い合わせについて聞かれたら】
- 「下のメニューの📩お問い合わせボタンから送れるよ」と案内する

【重要】挨拶や軽い雑談にはLP案内は不要。自然な会話でOK。`;

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

    // ── 「お問い合わせ」ボタン → 連絡モード ──
    if (userMessage === "お問い合わせ" || userMessage === "問い合わせ") {
      contactMode.set(userId, true);
      await lineClient.replyMessage({
        replyToken,
        messages: [{
          type: "text",
          text: "事務局へのメッセージを入力してください 📩\n（次に送るメッセージが事務局に届きます。キャンセルは「やめる」と送ってね）",
          quickReply: { items: QUICK_REPLY_ITEMS },
        }],
      });
      return;
    }

    // ── 連絡モード中 → Telegram転送 ──
    if (contactMode.get(userId)) {
      contactMode.delete(userId);

      if (userMessage === "やめる" || userMessage === "キャンセル") {
        await lineClient.replyMessage({
          replyToken,
          messages: [{
            type: "text",
            text: "キャンセルしました 🌸",
            quickReply: { items: QUICK_REPLY_ITEMS },
          }],
        });
        return;
      }

      await forwardToTelegram(userId, displayName ?? "不明", userMessage, "namisapo");

      await lineClient.replyMessage({
        replyToken,
        messages: [{
          type: "text",
          text: "事務局にメッセージを送りました 📩\nお返事をお待ちくださいね。",
          quickReply: { items: QUICK_REPLY_ITEMS },
        }],
      });
      return;
    }

    // ── 全メッセージ → AI応答 ──
    const reply = await generateResponse(userMessage);
    await lineClient.replyMessage({
      replyToken,
      messages: [{
        type: "text",
        text: reply,
        quickReply: { items: QUICK_REPLY_ITEMS },
      }],
    });
  } catch (error) {
    console.error("[NAMISAPO Bot] Error:", error);
    try {
      await lineClient.replyMessage({
        replyToken,
        messages: [{
          type: "text",
          text: "申し訳ございません、少しエラーが起きてしまいました 💦\nもう一度お試しください。",
          quickReply: { items: QUICK_REPLY_ITEMS },
        }],
      });
    } catch { /* replyToken expired */ }
  }
}

async function generateResponse(userMessage: string): Promise<string> {
  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: env.MICHELLE_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
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
    messages: [{
      type: "text",
      text: `📩 事務局からの返信:\n\n${message}`,
    }],
  });
}
