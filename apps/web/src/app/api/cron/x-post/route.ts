/** X自動投稿 Cronエンドポイント */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRandomQuote } from "@/lib/x-post/quotes-master";
import { generateXPost } from "@/lib/x-post/generator";
import { postToX } from "@/lib/x-post/twitter";
import {
  notifyTelegram,
  buildSuccessMessage,
  buildErrorMessage,
} from "@/lib/x-post/telegram-notify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function getCronSlot(): "morning" | "noon" | "night" {
  const now = new Date();
  const jstHour = (now.getUTCHours() + 9) % 24;
  if (jstHour >= 6 && jstHour < 10) return "morning";
  if (jstHour >= 11 && jstHour < 14) return "noon";
  if (jstHour >= 20 && jstHour < 23) return "night";
  return "morning";
}

export async function GET(request: Request) {
  // Vercel Cron認証
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.log(`[X Auto Post] Auth failed. Header: "${authHeader?.substring(0, 20)}...", CRON_SECRET set: ${!!cronSecret}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // X API環境変数の確認ログ
  console.log(`[X Auto Post] X_API_KEY set: ${!!process.env.X_API_KEY}, X_ACCESS_TOKEN set: ${!!process.env.X_ACCESS_TOKEN}`);

  const slot = getCronSlot();
  console.log(`[X Auto Post] Cron triggered: slot=${slot}`);

  try {
    // ① 過去7日に使用したquote_idを取得（重複回避）
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: recentLogs } = await supabase
      .from("x_post_logs")
      .select("quote_id")
      .gte("posted_at", sevenDaysAgo)
      .eq("status", "posted");

    const usedIds = recentLogs?.map((r) => r.quote_id) ?? [];

    // ② 名言をランダム選択
    const quote = getRandomQuote(usedIds);
    if (!quote) {
      const msg = buildErrorMessage(
        slot,
        "利用可能な名言がありません（7日間で全件使用済み）",
      );
      await notifyTelegram(msg);
      return NextResponse.json(
        { error: "No available quotes" },
        { status: 500 },
      );
    }

    console.log(`[X Auto Post] Selected quote: ${quote.id} - ${quote.text}`);

    // ③ OpenAIで投稿文生成
    const generated = await generateXPost(quote);
    console.log(
      `[X Auto Post] Generated post: ${generated.fullText.substring(0, 50)}...`,
    );

    // ④ X APIで投稿
    const postResult = await postToX(generated.fullText);

    // ⑤ Supabaseにログ保存
    await supabase.from("x_post_logs").insert({
      quote_id: quote.id,
      quote_text: quote.text,
      quote_source: quote.source,
      quote_character: quote.character ?? null,
      post_body: generated.fullText,
      hashtags: generated.hashtags,
      category: quote.category,
      status: postResult.success ? "posted" : "failed",
      x_post_id: postResult.tweetId ?? null,
      error_message: postResult.error ?? null,
      cron_slot: slot,
    });

    // ⑥ Telegram通知
    if (postResult.success) {
      const msg = buildSuccessMessage(
        slot,
        quote.text,
        quote.source,
        postResult.tweetId!,
      );
      await notifyTelegram(msg);
      console.log(`[X Auto Post] Success: tweetId=${postResult.tweetId}`);
      return NextResponse.json({
        success: true,
        tweetId: postResult.tweetId,
      });
    } else {
      const msg = buildErrorMessage(slot, postResult.error ?? "Unknown error");
      await notifyTelegram(msg);
      console.error(`[X Auto Post] Failed: ${postResult.error}`);
      return NextResponse.json({ error: postResult.error }, { status: 500 });
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[X Auto Post] Unexpected error:", errMsg);
    await notifyTelegram(buildErrorMessage(slot, errMsg));
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
