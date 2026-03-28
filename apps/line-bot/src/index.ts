/** Michelle LINE Bot — テープ式心理学カウンセラー */

import "dotenv/config";
import express from "express";
import { messagingApi, middleware, WebhookEvent } from "@line/bot-sdk";
import { env } from "./env.js";
import { ensureSession, updateDisplayName, clearHistory } from "./session.js";
import { chat } from "./michelle.js";
import { checkAccess, buildExpiredMessage, buildTrialNotice } from "./subscription.js";
import { handleNamisapoEvent, replyToNamisapoUser } from "./namisapo-handler.js";

const { MessagingApiClient } = messagingApi;

const lineConfig = {
  channelSecret: env.LINE_CHANNEL_SECRET,
};

const client = new MessagingApiClient({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
});

const app = express();

// ── 「仁さんに連絡」モード管理 ─────────────────────────
const contactMode = new Map<string, boolean>(); // userId -> in contact mode

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

// ── Telegram → LINE 返信API ─────────────────────────
app.post("/reply-to-line", express.json(), async (req, res) => {
  const { userId, message, secret } = req.body;
  if (secret !== process.env.INTERNAL_API_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!userId || !message) {
    res.status(400).json({ error: "userId and message required" });
    return;
  }
  try {
    await client.pushMessage({
      to: userId,
      messages: [{ type: "text", text: `📩 仁さんからの返信:\n\n${message}` }],
    });
    res.json({ status: "ok" });
  } catch (error) {
    console.error("[LINE Reply] Error:", error);
    res.status(500).json({ error: "Failed to send" });
  }
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

    // ── 「仁さんに連絡したい」トリガー ──
    if (userMessage === "仁さんに連絡したい") {
      const { supabase: sb } = await import("./supabase.js");
      const access = await checkAccess(session.id);
      const { data: sub } = await sb
        .from("line_bot_subscriptions")
        .select("plan_amount, status")
        .eq("session_id", session.id)
        .maybeSingle();

      const planAmount = sub?.plan_amount ?? 0;
      const isPremiumOrHigher = (planAmount >= 1980) && sub?.status === "active";
      const isTrial = access.status === "trial";

      if (!isPremiumOrHigher && !isTrial) {
        await client.replyMessage({
          replyToken,
          messages: [{
            type: "text",
            text: "「仁さんに相談」はスタンダードプラン以上の機能です 🌸\n\n・スタンダード（¥1,980/月）→ 月10回\n・プレミアム（¥2,980/月）→ 月20回\n\n→ https://namisapo.app/michelle/subscribe" + (session.id ? `?sid=${session.id}` : ""),
          }],
        });
        return;
      }

      // 月間上限チェック
      if (isPremiumOrHigher) {
        const maxTurns = planAmount >= 2980 ? 20 : 10;
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const { count } = await sb
          .from("line_contact_tickets")
          .select("id", { count: "exact", head: true })
          .eq("session_id", session.id)
          .gte("created_at", thisMonth.toISOString());

        if ((count ?? 0) >= maxTurns) {
          await client.replyMessage({
            replyToken,
            messages: [{
              type: "text",
              text: `今月の仁さんへの相談回数（${maxTurns}回）に達しました。来月またご利用いただけます 🌸`,
            }],
          });
          return;
        }
      }

      contactMode.set(userId, true);
      await client.replyMessage({
        replyToken,
        messages: [{
          type: "text",
          text: "仁さんへのメッセージを入力してください 📩\n（次に送るメッセージが仁さんに届きます。キャンセルは「やめる」と送ってね）",
        }],
      });
      return;
    }

    // ── 連絡モード中 ──
    if (contactMode.get(userId)) {
      contactMode.delete(userId);

      if (userMessage === "やめる" || userMessage === "キャンセル") {
        await client.replyMessage({
          replyToken,
          messages: [{ type: "text", text: "キャンセルしました。ミシェルとの会話に戻りますね 🌸" }],
        });
        return;
      }

      const { supabase: sb } = await import("./supabase.js");

      // チケット作成（連番ID）
      const { data: ticket } = await sb
        .from("line_contact_tickets")
        .insert({
          session_id: session.id,
          line_user_id: userId,
          display_name: displayName ?? null,
          message: userMessage,
        })
        .select("id")
        .single();

      const ticketId = ticket?.id ?? "?";

      // ユーザーカルテ取得（メモリ）
      const { data: memories } = await sb
        .from("telegram_bot_user_memories")
        .select("category, content, metadata")
        .eq("session_id", session.id)
        .order("importance", { ascending: false })
        .limit(20);

      const { data: summaryData } = await sb
        .from("telegram_bot_user_summaries")
        .select("summary, person_map")
        .eq("session_id", session.id)
        .maybeSingle();

      // カルテ構築
      const persons = (memories ?? []).filter((m: any) => m.category === "person");
      const tapes = (memories ?? []).filter((m: any) => m.category === "duct_tape");
      const episodes = (memories ?? []).filter((m: any) => m.category === "episode").slice(0, 3);

      let carte = "";
      if (summaryData?.summary) {
        carte += `\n📋 <b>サマリー:</b> ${summaryData.summary}`;
      }
      if (persons.length > 0) {
        carte += `\n👥 <b>人物MAP:</b>`;
        for (const p of persons) {
          const meta = p.metadata as any;
          const label = meta?.name ? `${meta.name}(${meta.relationship ?? ""})` : "";
          carte += `\n  ・${label}: ${p.content.substring(0, 50)}`;
        }
      }
      if (tapes.length > 0) {
        carte += `\n🏷 <b>ガムテープ:</b>`;
        for (const t of tapes) {
          carte += `\n  ・${t.content.substring(0, 50)}`;
        }
      }
      if (episodes.length > 0) {
        carte += `\n📝 <b>直近の出来事:</b>`;
        for (const e of episodes) {
          carte += `\n  ・${e.content.substring(0, 50)}`;
        }
      }

      // Telegram通知（カルテ付き）
      const name = displayName ?? "不明";
      const telegramMsg =
        `📩 <b>新規相談 #${ticketId}</b>\n\n` +
        `👤 ${name}` +
        carte +
        `\n\n💬 「${userMessage}」\n\n` +
        `/resolve ${ticketId} ここに返信テキスト\n` +
        `/history ${ticketId}`;

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
      if (botToken && chatId) {
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

      await client.replyMessage({
        replyToken,
        messages: [{ type: "text", text: `仁さんにメッセージを送りました（相談 #${ticketId}）✨\nお返事をお待ちくださいね。` }],
      });
      return;
    }

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

// ── NAMIDAサポート協会 LINE Webhook ──────────────────────
if (env.NAMISAPO_LINE_CHANNEL_SECRET) {
  app.post(
    "/webhook-namisapo",
    middleware({ channelSecret: env.NAMISAPO_LINE_CHANNEL_SECRET }),
    async (req: express.Request, res: express.Response) => {
      const events: WebhookEvent[] = req.body.events;
      await Promise.all(events.map(handleNamisapoEvent));
      res.status(200).json({ status: "ok" });
    },
  );

  // Telegram → NAMIDAサポート協会LINE 返信API
  app.post("/reply-to-namisapo", express.json(), async (req, res) => {
    const { userId, message, secret } = req.body;
    if (secret !== process.env.INTERNAL_API_SECRET) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!userId || !message) {
      res.status(400).json({ error: "userId and message required" });
      return;
    }
    try {
      await replyToNamisapoUser(userId, message);
      res.json({ status: "ok" });
    } catch (error) {
      console.error("[NAMISAPO Reply] Error:", error);
      res.status(500).json({ error: "Failed to send" });
    }
  });

  console.log("✅ NAMIDAサポート協会 webhook: /webhook-namisapo");
}

// ── Start ──────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`🌸 Michelle LINE Bot listening on port ${PORT}`);
  console.log(`✨ Webhook URL: http://localhost:${PORT}/webhook`);
});
