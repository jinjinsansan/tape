import { getSupabaseAdminClient } from "@/server/supabase";
import { sendNotificationEmail } from "@/server/notifications/resend";

const getTodayDateJST = (): string => {
  const now = new Date();
  const jstOffset = 9 * 60;
  const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000);
  return jstTime.toISOString().split("T")[0];
};

const buildReminderEmailHtml = (displayName: string | null) => {
  const name = displayName || "あなた";
  return `<!doctype html>
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; background: #f6f6f6; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #f1ddce; }
        .title { font-size: 20px; font-weight: 700; color: #7a4b34; margin-bottom: 16px; }
        .body { font-size: 15px; color: #4b3625; line-height: 1.8; margin-bottom: 24px; }
        .cta { display: inline-block; background: #d4a574; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px; }
        .cta:hover { background: #c29563; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1ddce; font-size: 12px; color: #a07458; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="title">🌙 ${name}さん、今日の日記を書きませんか？</div>
        <div class="body">
          <p>こんばんは。今日も一日お疲れさまでした。</p>
          <p>今日はどんな一日でしたか？<br />
          感じたこと、考えたことを日記に残してみましょう。</p>
          <p>日記を書くことで、自分の気持ちを整理し、<br />
          心の健康をサポートすることができます。</p>
          <a href="https://namisapo.app/diary" class="cta">日記を書く</a>
        </div>
        <div class="footer">
          <p>一般社団法人NAMIDAサポート協会</p>
          <p style="font-size: 11px; color: #b8a89a; margin-top: 8px;">
            このメールが不要な場合は、マイページの設定から配信を停止できます。
          </p>
        </div>
      </div>
    </body>
  </html>`;
};

type ReminderResult = {
  totalUsers: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
};

export const sendDiaryReminders = async (): Promise<ReminderResult> => {
  const client = getSupabaseAdminClient();
  const today = getTodayDateJST();

  const result: ReminderResult = {
    totalUsers: 0,
    sentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: []
  };

  try {
    const authAdmin = client.auth.admin;
    const perPage = 1000;
    let page = 1;
    const allUsers: Array<{ id: string; email: string | null }> = [];

    while (true) {
      const { data, error } = await authAdmin.listUsers({ page, perPage });
      if (error) {
        throw error;
      }
      allUsers.push(...data.users.map((u) => ({ id: u.id, email: u.email ?? null })));
      if (data.users.length < perPage) {
        break;
      }
      page += 1;
    }

    result.totalUsers = allUsers.length;

    const userIds = allUsers.map((u) => u.id);
    if (userIds.length === 0) {
      return result;
    }

    const { data: profiles } = await client
      .from("profiles")
      .select("id, display_name, diary_reminder_enabled")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, { displayName: p.display_name, enabled: p.diary_reminder_enabled }])
    );

    // Use RPC for efficient checking if user has entry today
    const { data: usersWithEntry } = await client.rpc("get_users_with_diary_today", { 
      p_journal_date: today 
    });

    const usersWithEntryToday = new Set(
      (usersWithEntry as Array<{ user_id: string }> ?? []).map((e) => e.user_id)
    );

    for (const user of allUsers) {
      if (!user.email) {
        result.skippedCount += 1;
        continue;
      }

      const profile = profileMap.get(user.id);
      if (!profile || !profile.enabled) {
        result.skippedCount += 1;
        continue;
      }

      if (usersWithEntryToday.has(user.id)) {
        result.skippedCount += 1;
        continue;
      }

      try {
        const html = buildReminderEmailHtml(profile.displayName);
        await sendNotificationEmail({
          to: user.email,
          subject: "🌙 今日の日記を書きませんか？",
          html
        });
        result.sentCount += 1;
      } catch (err) {
        result.failedCount += 1;
        const errorMsg = err instanceof Error ? err.message : String(err);
        result.errors.push(`User ${user.id}: ${errorMsg}`);
        console.error(`Failed to send diary reminder to ${user.email}`, err);
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to send diary reminders", error);
    throw error;
  }
};
