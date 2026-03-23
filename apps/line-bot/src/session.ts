/** LINE Bot session management — stores conversations in Supabase */

import { supabase } from "./supabase.js";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const MAX_HISTORY = 30;

export async function ensureSession(lineUserId: string, displayName?: string) {
  const { data, error } = await supabase
    .from("line_bot_sessions")
    .select("id, display_name, message_count, trial_started_at")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: created, error: createError } = await supabase
    .from("line_bot_sessions")
    .insert({
      line_user_id: lineUserId,
      display_name: displayName ?? null,
      message_count: 0,
    })
    .select("id, display_name, message_count, trial_started_at")
    .single();

  if (createError) throw createError;

  // Create subscription record with trial
  await supabase.from("line_bot_subscriptions").insert({
    session_id: created.id,
    status: "trial",
    trial_ends_at: trialEndsAt,
  });

  return created;
}

export async function updateDisplayName(sessionId: string, name: string) {
  await supabase
    .from("line_bot_sessions")
    .update({ display_name: name })
    .eq("id", sessionId);
}

export async function incrementMessageCount(sessionId: string) {
  const { data } = await supabase
    .from("line_bot_sessions")
    .select("message_count")
    .eq("id", sessionId)
    .single();

  await supabase
    .from("line_bot_sessions")
    .update({ message_count: (data?.message_count ?? 0) + 1 })
    .eq("id", sessionId);
}

export async function saveMessage(
  sessionId: string,
  role: ChatMessage["role"],
  content: string,
) {
  const { error } = await supabase.from("line_bot_messages").insert({
    session_id: sessionId,
    role,
    content,
  });
  if (error) console.error("Failed to save message:", error.message);
}

export async function loadHistory(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("line_bot_messages")
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

export async function clearHistory(sessionId: string) {
  await supabase
    .from("line_bot_messages")
    .delete()
    .eq("session_id", sessionId);

  await supabase
    .from("line_bot_sessions")
    .update({ message_count: 0 })
    .eq("id", sessionId);
}
