import { NextResponse } from "next/server";

import { fetchPointRules, listAllRewards } from "@/server/services/points";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rules, rewards] = await Promise.all([
      fetchPointRules(),
      listAllRewards()
    ]);

    const activeRules = rules.filter((rule) => rule.is_active);
    const activeRewards = rewards.filter((reward) => reward.is_active);

    return NextResponse.json({ rules: activeRules, rewards: activeRewards });
  } catch (error) {
    console.error("Failed to load point info", error);
    return NextResponse.json({ error: "Failed to load point info" }, { status: 500 });
  }
}
