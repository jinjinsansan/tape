/** Michelle LINE Bot — テープ式心理学カウンセラー */

import "dotenv/config";
import express from "express";
import { messagingApi, middleware, WebhookEvent } from "@line/bot-sdk";
import { env } from "./env.js";
import { ensureSession, updateDisplayName, clearHistory } from "./session.js";
import { chat } from "./michelle.js";
import { checkAccess, buildExpiredMessage, buildTrialNotice } from "./subscription.js";

const { MessagingApiClient } = messagingApi;

const lineConfig = {
  channelSecret: env.LINE_CHANNEL_SECRET,
};

const client = new MessagingApiClient({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
});

const app = express();

// LINE Webhook endpoint
app.post(
  "/webhook",
  middleware(lineConfig),
  async (req: express.Request, res: express.Response) => {
    const events: WebhookEvent[] = req.body.events;

    await Promise.all(events.map(handleEvent));
    res.status(200).json({ status: "ok" });
  },
);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", bot: "michelle-line" });
});

async function handleEvent(event: WebhookEvent): Promise<void> {
  // テキストメッセージのみ処理
  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  const userId = event.source.userId;
  if (!userId) return;

  const replyToken = event.replyToken;
  const userMessage = event.message.text;

  try {
    // LINE プロフィール取得
    let displayName: string | undefined;
    try {
      const profile = await client.getProfile(userId);
      displayName = profile.displayName;
    } catch {
      // プロフィール取得失敗は無視
    }

    const session = await ensureSession(userId, displayName);

    // サブスクリプションチェック
    const access = await checkAccess(session.id);

    if (access.status === "expired") {
      const msg = buildExpiredMessage(session.display_name, session.id);
      await client.replyMessage({
        replyToken,
        messages: [{ type: "text", text: msg }],
      });
      return;
    }

    // トライアル残り1日通知
    if (
      access.status === "trial" &&
      access.trialRemainingDays === 1
    ) {
      const notice = buildTrialNotice(
        session.display_name,
        access.trialRemainingDays,
      );
      if (notice) {
        // 通知はpushMessageで送り、会話はreplyで続ける
        await client.pushMessage({
          to: userId,
          messages: [{ type: "text", text: notice }],
        });
      }
    }

    // ローディングアニメーション表示（無料）
    await client.showLoadingAnimation({ chatId: userId }).catch(() => {});

    // ミシェルAIで返答生成
    const reply = await chat(session.id, userMessage, session.display_name);

    // replyMessageで返信（無料）
    const messages = splitMessage(reply, 5000).map((text) => ({
      type: "text" as const,
      text,
    }));

    await client.replyMessage({ replyToken, messages });
  } catch (error) {
    console.error("[LINE Bot] Error:", error);
    try {
      await client.replyMessage({
        replyToken,
        messages: [
          {
            type: "text",
            text: "ごめんね、ちょっとエラーが起きちゃった 💦\n少し待ってからもう一度話しかけてみてね。",
          },
        ],
      });
    } catch {
      // replyToken期限切れの場合は無視
    }
  }
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, maxLength));
    remaining = remaining.slice(maxLength);
  }
  return chunks;
}

// ── Start ──────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`🌸 Michelle LINE Bot listening on port ${PORT}`);
  console.log(`✨ Webhook URL: http://localhost:${PORT}/webhook`);
});
