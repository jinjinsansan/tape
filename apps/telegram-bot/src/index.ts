import "dotenv/config";
import { Bot, GrammyError, HttpError } from "grammy";
import { env } from "./env.js";
import { ensureSession, updateDisplayName, clearHistory } from "./session.js";
import { chat } from "./michelle.js";

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
bot.start({
  onStart: () => console.log("✨ Michelle is online!"),
});
