import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getPublicFeedEntryById, incrementFeedShareCount } from "@/server/services/feed";
import { awardPoints } from "@/server/services/points";
import { getSupabaseAdminClient } from "@/server/supabase";

const paramsSchema = z.object({
  entryId: z.string().uuid()
});

const bodySchema = z
  .object({
    platform: z.enum(["copy", "x", "line"]).optional()
  })
  .optional();

export async function POST(request: Request, context: { params: { entryId: string } }) {
  const { entryId } = paramsSchema.parse(context.params);
  try {
    const entry = await getPublicFeedEntryById(entryId);
    if (!entry || !entry.isShareable) {
      return NextResponse.json({ error: "This diary entry cannot be shared." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.parse(body ?? undefined);

    const shareCount = await incrementFeedShareCount(entryId);

    // ログイン済みユーザーの場合、シェアログを記録
    let twitterUsername: string | null = null;
    try {
      const cookieStore = cookies();
      const supabase = createSupabaseRouteClient(cookieStore);
      const user = await getRouteUser(supabase, "Feed share");
      
      if (user) {
        // Xアカウント情報を取得
        const { data: profile } = await supabase
          .from("profiles")
          .select("twitter_username")
          .eq("id", user.id)
          .single();
        
        twitterUsername = profile?.twitter_username ?? null;

        // シェアログを記録
        const admin = getSupabaseAdminClient();
        await admin.from("feed_share_log").insert({
          user_id: user.id,
          entry_id: entryId,
          platform: parsed?.platform ?? "copy",
          twitter_username: twitterUsername,
          metadata: {}
        });

        // Xシェアの場合のみポイント付与（アカウント登録済みの場合）
        if (parsed?.platform === "x" && twitterUsername) {
          await awardPoints({ userId: user.id, action: "feed_share_x", referenceId: entryId });
        }
      }
    } catch (logError) {
      console.error("Failed to record share or award points", logError);
    }

    return NextResponse.json({ shareCount });
  } catch (error) {
    console.error("Failed to record feed share", error);
    return NextResponse.json({ error: "Failed to record share" }, { status: 500 });
  }
}
