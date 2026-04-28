import "dotenv/config";
import { Bot, GrammyError, HttpError } from "grammy";
import { env } from "./env.js";
import { ensureSession, updateDisplayName, clearHistory } from "./session.js";
import { chat } from "./michelle.js";
// X自動投稿は停止中（2026-04-28）
// import { startXPostCron } from "./x-post.js";

const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

// ── /start ─────────────────────────────────────────────
bot.command("start", async (ctx) => {
  const telegramChatId = ctx.chat.id;
  const username = ctx.from?.first_name ?? ctx.from?.username ?? undefined;
  const session = await ensureSession(telegramChatId, username);

  const name = session.display_name ?? username ?? "あなた";
  await ctx.reply(
    `こんにちは、${name}さん ✨\n\n` +
    `わたしは「ミシェル」🌸\n` +
    `テープ式心理学をベースに、あなたの心に寄り添うカウンセラーだよ。\n\n` +
    `💫 日常の悩みや不安\n` +
    `💫 自分の感情や心のクセについて知りたいこと\n` +
    `💫 なんとなくモヤモヤする気持ち\n\n` +
    `なんでも気軽に話しかけてね！\n` +
    `あなたのことを覚えているから、いつでも続きから話せるよ 🌈\n\n` +
    `📝 コマンド:\n` +
    `/name 呼び名 — 呼び名を変更\n` +
    `/reset — 会話をリセット\n` +
    `/help — ヘルプを表示`,
  );
});

// ── /help ──────────────────────────────────────────────
bot.command("help", async (ctx) => {
  await ctx.reply(
    `🌈 ミシェル心理カウンセラーBOT ヘルプ\n\n` +
    `テープ式心理学に基づいて、あなたの心に寄り添います。\n` +
    `会話の中で大切なことを覚えていくので、あなただけのカウンセラーになるよ ✨\n\n` +
    `📝 コマンド:\n` +
    `/start — 最初から始める\n` +
    `/name 呼び名 — 呼び名を変更（例: /name みき）\n` +
    `/reset — 会話履歴をリセット（記憶は残ります）\n` +
    `/help — このヘルプを表示\n\n` +
    `💬 普通にメッセージを送るだけでミシェルが答えます！`,
  );
});

// ── /name ──────────────────────────────────────────────
bot.command("name", async (ctx) => {
  const newName = ctx.match?.trim();
  if (!newName) {
    await ctx.reply("呼び名を入力してね！\n例: /name みき");
    return;
  }

  const session = await ensureSession(ctx.chat.id);
  await updateDisplayName(session.id, newName);
  await ctx.reply(`これからは「${newName}」さんって呼ぶね ✨`);
});

// ── /reset ─────────────────────────────────────────────
bot.command("reset", async (ctx) => {
  const session = await ensureSession(ctx.chat.id);
  await clearHistory(session.id);
  await ctx.reply("会話をリセットしました 🌸\n新しい気持ちで話しかけてね！");
});

// ── /resolve — チケット番号で返信 ────────────────────────
bot.command("resolve", async (ctx) => {
  const text = ctx.match?.trim();
  if (!text) {
    await ctx.reply("使い方: /resolve チケット番号 返信テキスト\n\n例: /resolve 1 お気持ちわかります。");
    return;
  }

  const spaceIdx = text.indexOf(" ");
  if (spaceIdx === -1) {
    await ctx.reply("返信テキストを入力してください。\n/resolve 1 返信テキスト");
    return;
  }

  const ticketId = parseInt(text.substring(0, spaceIdx).trim(), 10);
  const replyMessage = text.substring(spaceIdx + 1).trim();

  if (isNaN(ticketId) || !replyMessage) {
    await ctx.reply("チケット番号と返信テキストが必要です。\n/resolve 1 返信テキスト");
    return;
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // チケット取得
    const { data: ticket } = await sb
      .from("line_contact_tickets")
      .select("id, line_user_id, display_name, status")
      .eq("id", ticketId)
      .single();

    if (!ticket) {
      await ctx.reply(`❌ チケット #${ticketId} が見つかりません。`);
      return;
    }

    if (ticket.status === "resolved") {
      await ctx.reply(`⚠️ チケット #${ticketId} は既に対応済みです。`);
      return;
    }

    // LINE Botの返信APIを呼ぶ
    const lineApiSecret = process.env.INTERNAL_API_SECRET ?? "michelle-internal";
    const lineApiUrl = process.env.LINE_BOT_API_URL ?? "http://localhost:3001";

    const res = await fetch(`${lineApiUrl}/reply-to-line`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: ticket.line_user_id,
        message: replyMessage,
        secret: lineApiSecret,
      }),
    });

    if (res.ok) {
      // チケットを resolved に更新
      await sb
        .from("line_contact_tickets")
        .update({
          status: "resolved",
          resolved_message: replyMessage,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      await ctx.reply(
        `✅ #${ticketId} ${ticket.display_name ?? ""}さんに返信しました。\n\n送信: ${replyMessage.substring(0, 100)}`,
      );
    } else {
      await ctx.reply(`❌ 送信失敗: ${await res.text()}`);
    }
  } catch (error) {
    await ctx.reply(`❌ エラー: ${error instanceof Error ? error.message : "Unknown"}`);
  }
});

// ── /resolve_namisapo — NAMIDAサポート協会チケットに返信 ──
bot.command("resolve_namisapo", async (ctx) => {
  const text = ctx.match?.trim();
  if (!text) {
    await ctx.reply("使い方: /resolve_namisapo チケット番号 返信テキスト\n\n例: /resolve_namisapo 3 ご連絡ありがとうございます。");
    return;
  }

  const spaceIdx = text.indexOf(" ");
  if (spaceIdx === -1) {
    await ctx.reply("返信テキストを入力してください。\n/resolve_namisapo 3 返信テキスト");
    return;
  }

  const ticketId = parseInt(text.substring(0, spaceIdx).trim(), 10);
  const replyMessage = text.substring(spaceIdx + 1).trim();

  if (isNaN(ticketId) || !replyMessage) {
    await ctx.reply("チケット番号と返信テキストが必要です。\n/resolve_namisapo 3 返信テキスト");
    return;
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: ticket } = await sb
      .from("line_contact_tickets")
      .select("id, line_user_id, display_name, status, source")
      .eq("id", ticketId)
      .single();

    if (!ticket) {
      await ctx.reply(`❌ チケット #${ticketId} が見つかりません。`);
      return;
    }

    if (ticket.status === "resolved") {
      await ctx.reply(`⚠️ チケット #${ticketId} は既に対応済みです。`);
      return;
    }

    const lineApiSecret = process.env.INTERNAL_API_SECRET ?? "michelle-internal";
    const lineApiUrl = process.env.LINE_BOT_API_URL ?? "http://localhost:3001";

    const res = await fetch(`${lineApiUrl}/reply-to-namisapo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: ticket.line_user_id,
        message: replyMessage,
        secret: lineApiSecret,
      }),
    });

    if (res.ok) {
      await sb
        .from("line_contact_tickets")
        .update({
          status: "resolved",
          resolved_message: replyMessage,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      await ctx.reply(
        `✅ [NAMISAPO] #${ticketId} ${ticket.display_name ?? ""}さんに返信しました。\n\n送信: ${replyMessage.substring(0, 100)}`,
      );
    } else {
      await ctx.reply(`❌ 送信失敗: ${await res.text()}`);
    }
  } catch (error) {
    await ctx.reply(`❌ エラー: ${error instanceof Error ? error.message : "Unknown"}`);
  }
});

// ── /history — ユーザーの直近会話履歴を表示 ─────────────
bot.command("history", async (ctx) => {
  const text = ctx.match?.trim();
  if (!text) {
    await ctx.reply("使い方: /history チケット番号\n\n例: /history 1");
    return;
  }

  const ticketId = parseInt(text, 10);
  if (isNaN(ticketId)) {
    await ctx.reply("チケット番号を入力してください。\n/history 1");
    return;
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // チケットからセッションIDを取得
    const { data: ticket } = await sb
      .from("line_contact_tickets")
      .select("id, session_id, display_name, message, created_at")
      .eq("id", ticketId)
      .single();

    if (!ticket) {
      await ctx.reply(`❌ チケット #${ticketId} が見つかりません。`);
      return;
    }

    // 直近の会話履歴を取得
    const { data: messages } = await sb
      .from("line_bot_messages")
      .select("role, content, created_at")
      .eq("session_id", ticket.session_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!messages || messages.length === 0) {
      await ctx.reply(`#${ticketId} ${ticket.display_name ?? ""}さんの会話履歴はありません。`);
      return;
    }

    let history = `📜 #${ticketId} ${ticket.display_name ?? ""}さんの直近会話:\n\n`;
    for (const m of messages.reverse()) {
      const role = m.role === "user" ? "👤" : m.role === "assistant" ? "🌸" : "⚙️";
      const content = m.content.substring(0, 100);
      history += `${role} ${content}\n\n`;
    }

    // 長すぎる場合は分割
    if (history.length > 4000) {
      history = history.substring(0, 4000) + "\n\n...（省略）";
    }

    await ctx.reply(history);
  } catch (error) {
    await ctx.reply(`❌ エラー: ${error instanceof Error ? error.message : "Unknown"}`);
  }
});

// ── メッセージハンドラ ────────────────────────────────────
bot.on("message:text", async (ctx) => {
  const telegramChatId = ctx.chat.id;
  const username = ctx.from?.first_name ?? ctx.from?.username ?? undefined;
  const userMessage = ctx.message.text;

  try {
    // Show "typing" indicator
    await ctx.replyWithChatAction("typing");

    const session = await ensureSession(telegramChatId, username);
    const reply = await chat(session.id, userMessage, session.display_name);

    // Telegram has a 4096 char limit per message
    if (reply.length <= 4096) {
      await ctx.reply(reply);
    } else {
      // Split into chunks
      const chunks: string[] = [];
      let remaining = reply;
      while (remaining.length > 0) {
        chunks.push(remaining.slice(0, 4096));
        remaining = remaining.slice(4096);
      }
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    }
  } catch (error) {
    console.error("Chat error:", error);
    await ctx.reply(
      "ごめんね、ちょっとエラーが起きちゃった 💦\n少し待ってからもう一度話しかけてみてね。",
    );
  }
});

// ── Error handler ──────────────────────────────────────
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;

  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

// ── Start ──────────────────────────────────────────────
console.log("🌸 Michelle Telegram Bot starting...");
// X自動投稿は停止中（2026-04-28）
// startXPostCron();
bot.start({
  onStart: () => console.log("✨ Michelle is online!"),
});
