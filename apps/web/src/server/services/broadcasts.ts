import type { Database } from "@tape/supabase";

import { createNotification, renderNotificationEmailHtml } from "@/server/services/notifications";
import { sendNotificationEmail } from "@/server/notifications/resend";
import { getSupabaseAdminClient } from "@/server/supabase";

type BroadcastAudience = "all" | "selected";

type BroadcastTarget = {
  userId: string;
  email: string | null;
};

type SendBroadcastParams = {
  authorId: string;
  subject: string;
  body: string;
  audience: BroadcastAudience;
  recipientIds?: string[];
};

const chunkArray = <T>(items: T[], size = 25): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const RESEND_MAX_RECIPIENTS_PER_REQUEST = 50;
const RESEND_REQUEST_INTERVAL_MS = 600;

type NotificationDeliveryInsert = Database["public"]["Tables"]["notification_deliveries"]["Insert"];

const fetchAllTargets = async () => {
  const client = getSupabaseAdminClient();
  const authAdmin = client.auth.admin;
  const perPage = 1000;
  let page = 1;
  const targets: BroadcastTarget[] = [];

  while (true) {
    const { data, error } = await authAdmin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }
    const pageUsers = data.users.map((user) => ({ userId: user.id, email: user.email ?? null }));
    targets.push(...pageUsers);
    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return targets;
};

const fetchTargetsByIds = async (ids: string[]) => {
  const client = getSupabaseAdminClient();
  const authAdmin = client.auth.admin;
  const uniqueIds = Array.from(new Set(ids));
  const targets: BroadcastTarget[] = [];

  await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const { data } = await authAdmin.getUserById(userId);
        if (data.user) {
          targets.push({ userId, email: data.user.email ?? null });
        }
      } catch (error) {
        console.error(`Failed to load user ${userId}`, error);
      }
    })
  );

  return targets;
};

export const sendBroadcast = async (params: SendBroadcastParams) => {
  const client = getSupabaseAdminClient();

  const targets =
    params.audience === "all"
      ? await fetchAllTargets()
      : await fetchTargetsByIds(params.recipientIds ?? []);

  if (targets.length === 0) {
    throw new Error("配信対象が見つかりませんでした");
  }

  const html = renderNotificationEmailHtml(params.subject, params.body);
  let success = 0;
  let failed = 0;
  const preparedTargets: { target: BroadcastTarget; notificationId: string }[] = [];

  for (const chunk of chunkArray(targets, 25)) {
    await Promise.all(
      chunk.map(async (target) => {
        try {
          const notification = await createNotification({
            userId: target.userId,
            channel: "in_app",
            type: "announcement.broadcast",
            category: "announcement",
            title: params.subject,
            body: params.body,
            data: { broadcast_subject: params.subject },
            userEmail: target.email,
            sendEmail: false
          });
          preparedTargets.push({ target, notificationId: notification.id });
        } catch (error) {
          console.error("Failed to enqueue broadcast notification", error);
          failed += 1;
        }
      })
    );
  }

  const insertDeliveryRecords = async (records: NotificationDeliveryInsert[]) => {
    if (!records.length) return;
    const { error } = await client.from("notification_deliveries").insert(records);
    if (error) {
      console.error("Failed to record notification deliveries", error);
    }
  };

  const emailReady = preparedTargets.filter(({ target }) => Boolean(target.email));
  const missingEmail = preparedTargets.filter(({ target }) => !target.email);

  if (missingEmail.length) {
    failed += missingEmail.length;
    await insertDeliveryRecords(
      missingEmail.map((item) => ({
        notification_id: item.notificationId,
        channel: "email",
        status: "skipped",
        external_reference: null
      }))
    );
  }

  const emailChunks = chunkArray(emailReady, RESEND_MAX_RECIPIENTS_PER_REQUEST);

  for (let index = 0; index < emailChunks.length; index += 1) {
    const chunk = emailChunks[index];
    const to = chunk.map((item) => item.target.email!);

    if (!to.length) {
      continue;
    }

    try {
      const externalRef = await sendNotificationEmail({
        to,
        subject: params.subject,
        html
      });

      if (externalRef) {
        success += chunk.length;
        await insertDeliveryRecords(
          chunk.map((item) => ({
            notification_id: item.notificationId,
            channel: "email",
            status: "sent",
            external_reference: externalRef
          }))
        );
      } else {
        failed += chunk.length;
        await insertDeliveryRecords(
          chunk.map((item) => ({
            notification_id: item.notificationId,
            channel: "email",
            status: "skipped",
            external_reference: null
          }))
        );
      }
    } catch (error) {
      console.error("Failed to send broadcast email batch", error);
      failed += chunk.length;
      await insertDeliveryRecords(
        chunk.map((item) => ({
          notification_id: item.notificationId,
          channel: "email",
          status: "failed",
          external_reference: null
        }))
      );
    }

    if (index < emailChunks.length - 1) {
      await sleep(RESEND_REQUEST_INTERVAL_MS);
    }
  }

  const sampleEmails = targets
    .map((target) => target.email ?? "メール未登録")
    .slice(0, Math.min(10, targets.length));

  const payload = {
    author_id: params.authorId,
    subject: params.subject,
    body: params.body,
    audience: params.audience,
    target_user_ids: params.audience === "selected" ? targets.map((target) => target.userId) : [],
    target_emails: sampleEmails,
    target_count: targets.length
  };

  const { data: broadcast, error } = await client
    .from("admin_broadcasts")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return { broadcast, stats: { success, failed } };
};

export const listBroadcasts = async () => {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("admin_broadcasts")
    .select("id, subject, body, audience, target_emails, target_count, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const deleteBroadcast = async (broadcastId: string) => {
  const client = getSupabaseAdminClient();
  const { error } = await client
    .from("admin_broadcasts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", broadcastId);

  if (error) {
    throw error;
  }
};
