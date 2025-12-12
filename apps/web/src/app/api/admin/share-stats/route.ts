import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin share stats");
  if (response) return response;

  try {
    const admin = getSupabaseAdminClient();

    // 全シェア統計
    const { count: totalShares } = await admin
      .from("feed_share_log")
      .select("*", { count: "exact", head: true });

    // Xシェア統計
    const { count: xShares } = await admin
      .from("feed_share_log")
      .select("*", { count: "exact", head: true })
      .eq("platform", "x");

    // Xアカウント登録ユーザー数
    const { count: usersWithTwitter } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("twitter_username", "is", null);

    // 最近のシェアログ（直近20件）
    const { data: recentSharesData } = await admin
      .from("feed_share_log")
      .select(`
        id,
        platform,
        twitter_username,
        shared_at,
        user_id
      `)
      .order("shared_at", { ascending: false })
      .limit(20);

    // ユーザー名を取得
    const recentShares = await Promise.all(
      (recentSharesData ?? []).map(async (share) => {
        const { data: profile } = await admin
          .from("profiles")
          .select("display_name")
          .eq("id", share.user_id)
          .single();

        return {
          id: share.id,
          userName: profile?.display_name ?? "Unknown",
          twitterUsername: share.twitter_username ?? "-",
          platform: share.platform,
          sharedAt: share.shared_at
        };
      })
    );

    return NextResponse.json({
      totalShares: totalShares ?? 0,
      xShares: xShares ?? 0,
      usersWithTwitter: usersWithTwitter ?? 0,
      recentShares
    });
  } catch (error) {
    console.error("Failed to load share stats", error);
    return NextResponse.json({ error: "Failed to load share stats" }, { status: 500 });
  }
}
