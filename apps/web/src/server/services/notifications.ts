import type { Database, Json, NotificationChannel, NotificationCategory } from "@tape/supabase";
import { getSupabaseAdminClient } from "@/server/supabase";
import { sendNotificationEmail } from "@/server/notifications/resend";

const supabase = () => getSupabaseAdminClient();

type ListOptions = {
  category?: NotificationCategory;
  limit?: number;
  includeRead?: boolean;
};

export const listNotifications = async (userId: string, options?: ListOptions) => {
  const client = supabase();
  let query = client
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  if (!options?.includeRead) {
    // no additional filter; kept for future extension
  }

  const { data, error } = await query;

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
  category?: NotificationCategory;
  userEmail?: string | null;
};

const deriveCategoryFromType = (type: string): NotificationCategory => {
  if (type.startsWith("wallet.")) return "wallet";
  if (type.startsWith("booking.")) return "booking";
  if (type.startsWith("announcement.")) return "announcement";
  return "other";
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildEmailHtml = (title: string, body: string) => {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br />");
  return `<!doctype html>
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; background: #f6f6f6; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #f1ddce; }
        .title { font-size: 18px; font-weight: 700; color: #7a4b34; margin-bottom: 16px; }
        .body { font-size: 14px; color: #4b3625; line-height: 1.6; white-space: pre-wrap; }
        .footer { margin-top: 24px; font-size: 12px; color: #a07458; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="title">${safeTitle}</div>
        <div class="body">${safeBody}</div>
        <div class="footer">一般社団法人NAMIDAサポート協会</div>
      </div>
    </body>
  </html>`;
};

export const createNotification = async (params: CreateNotificationParams) => {
  const client = supabase();
  const category = params.category ?? deriveCategoryFromType(params.type);
  const { data, error } = await client.rpc("enqueue_notification", {
    p_user_id: params.userId,
    p_channel: params.channel,
    p_type: params.type,
    p_title: params.title ?? null,
    p_body: params.body ?? null,
    p_data: params.data ?? null,
    p_category: category
  });

  if (error) {
    throw error;
  }

  const notification = data as Database["public"]["Tables"]["notifications"]["Row"];

  try {
    let email = params.userEmail ?? null;
    if (!email) {
      const { data: userResult, error: userError } = await client.auth.admin.getUserById(params.userId);
      if (userError) {
        throw userError;
      }
      email = userResult.user?.email ?? null;
    }
    if (email) {
      const subject = params.title ?? "テープ式心理学からのお知らせ";
      const html = buildEmailHtml(subject, params.body ?? "内容をご確認ください。");
      let status = "sent";
      let externalRef: string | null = null;

      try {
        const result = await sendNotificationEmail({ to: email, subject, html });
        if (result === null) {
          status = "skipped";
        } else {
          externalRef = (result as { id?: string } | null)?.id ?? null;
        }
      } catch (emailError) {
        console.error("Failed to send notification email", emailError);
        status = "failed";
      }

      await client
        .from("notification_deliveries")
        .insert({
          notification_id: notification.id,
          channel: "email",
          status,
          external_reference: externalRef
        });
    }
  } catch (emailErr) {
    console.error("Notification email handling failed", emailErr);
  }

  return notification;
};
