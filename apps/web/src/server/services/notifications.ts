import type { Database, Json, NotificationChannel } from "@tape/supabase";
import { getSupabaseAdminClient } from "@/server/supabase";

const supabase = () => getSupabaseAdminClient();

export const listNotifications = async (userId: string) => {
  const client = supabase();
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data;
};

export const markNotificationRead = async (notificationId: string, userId: string) => {
  const client = supabase();
  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
};

type CreateNotificationParams = {
  userId: string;
  channel: NotificationChannel;
  type: string;
  title?: string | null;
  body?: string | null;
  data?: Json;
};

export const createNotification = async (params: CreateNotificationParams) => {
  const client = supabase();
  const { data, error } = await client.rpc("enqueue_notification", {
    p_user_id: params.userId,
    p_channel: params.channel,
    p_type: params.type,
    p_title: params.title ?? null,
    p_body: params.body ?? null,
    p_data: params.data ?? null
  });

  if (error) {
    throw error;
  }

  return data as Database["public"]["Tables"]["notifications"]["Row"];
};
