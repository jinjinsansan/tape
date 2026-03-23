/** Telegram通知 — X投稿の成功/失敗を通知 */

export async function notifyTelegram(message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[X Post Notify] Bot token or chat ID not configured");
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (error) {
    console.error("[X Post Notify] Failed to send:", error);
  }
}

export function buildSuccessMessage(
  slot: string,
  quoteText: string,
  quoteSource: string,
  tweetId: string,
): string {
  const slotLabel =
    { morning: "☀️ 朝7時", noon: "🌞 昼12時", night: "🌙 夜21時" }[slot] ??
    slot;
  return (
    `✅ <b>X自動投稿成功</b> ${slotLabel}\n\n` +
    `「${quoteText}」\n— ${quoteSource}\n\n` +
    `🔗 https://x.com/i/web/status/${tweetId}`
  );
}

export function buildErrorMessage(slot: string, error: string): string {
  const slotLabel =
    { morning: "☀️ 朝7時", noon: "🌞 昼12時", night: "🌙 夜21時" }[slot] ??
    slot;
  return `❌ <b>X自動投稿失敗</b> ${slotLabel}\n\nエラー: ${error}`;
}
