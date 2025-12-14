import { NextResponse } from "next/server";

import { sendDiaryReminders } from "@/server/services/diary-reminder";

const CRON_SECRET = process.env.CRON_SECRET ?? process.env.DIARY_AI_CRON_SECRET;

const authorizeCron = (request: Request) => {
  if (!CRON_SECRET) {
    return true;
  }

  const header = request.headers.get("x-cron-secret");
  if (header && header === CRON_SECRET) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader === `Bearer ${CRON_SECRET}`) {
    return true;
  }

  return false;
};

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDiaryReminders();
    console.log("Diary reminder sent:", result);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Failed to send diary reminders", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
