import { NextResponse } from "next/server";

import { runDiaryAiCommentJobs } from "@/server/services/diary-ai-comments";

const CRON_SECRET = process.env.DIARY_AI_CRON_SECRET;

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

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 10) : 3;

  try {
    const result = await runDiaryAiCommentJobs(limit);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Failed to run diary AI jobs", error);
    return NextResponse.json({ error: "Failed to process jobs" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
