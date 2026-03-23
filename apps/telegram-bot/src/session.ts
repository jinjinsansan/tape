/** Telegram session management — stores conversations in Supabase */

import { supabase } from "./supabase.js";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const MAX_HISTORY = 30;

/**
 * Ensure a telegram_bot_sessions row exists for this chat.
 * Returns the session id and the user's display name (if set).
 */
export async function ensureSession(telegramChatId: number, telegramUsername?: string) {
  const { data, error } = await supabase
    .from("telegram_bot_sessions")
    .select("id, display_name, message_count")
    .eq("telegram_chat_id", String(telegramChatId))
    .maybeSingle();

  if (error) throw error;

  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from("telegram_bot_sessions")
    .insert({
      telegram_chat_id: String(telegramChatId),
      display_name: telegramUsername ?? null,
      message_count: 0,
    })
    .select("id, display_name, message_count")
    .single();

  if (createError) throw createError;
  return created;
}

export async function updateDisplayName(sessionId: string, name: string) {
  await supabase
    .from("telegram_bot_sessions")
    .update({ display_name: name })
    .eq("id", sessionId);
}

export async function incrementMessageCount(sessionId: string) {
  // Use rpc or raw update
  const { data } = await supabase
    .from("telegram_bot_sessions")
    .select("message_count")
    .eq("id", sessionId)
    .single();

  await supabase
    .from("telegram_bot_sessions")
    .update({ message_count: (data?.message_count ?? 0) + 1 })
    .eq("id", sessionId);
}

/** Append a message to history */
export async function saveMessage(
  sessionId: string,
  role: ChatMessage["role"],
  content: string,
) {
  const { error } = await supabase.from("telegram_bot_messages").insert({
    session_id: sessionId,
    role,
    content,
  });
  if (error) console.error("Failed to save message:", error.message);
}

/** Load recent message history for context window */
export async function loadHistory(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("telegram_bot_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);

  if (error) {
    console.error("Failed to load history:", error.message);
    return [];
  }

  return (data ?? [])
    .reverse()
    .map((row) => ({ role: row.role as ChatMessage["role"], content: row.content }));
}

/** Clear conversation history for a session */
export async function clearHistory(sessionId: string) {
  await supabase
    .from("telegram_bot_messages")
    .delete()
    .eq("session_id", sessionId);

  await supabase
    .from("telegram_bot_sessions")
    .update({ message_count: 0 })
    .eq("id", sessionId);
}
