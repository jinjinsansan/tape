import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const bodySchema = z.object({
  twitterUsername: z
    .string()
    .regex(/^[A-Za-z0-9_]{1,15}$/, "Xユーザー名は英数字とアンダースコアのみ、1〜15文字で入力してください")
    .transform((val) => val.toLowerCase())
});

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Get Twitter profile");
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("twitter_username, twitter_username_updated_at")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Failed to load Twitter profile", error);
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
    }

    return NextResponse.json({
      twitterUsername: profile?.twitter_username ?? null,
      updatedAt: profile?.twitter_username_updated_at ?? null
    });
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Update Twitter profile");
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    // 現在の登録情報を取得
    const { data: currentProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("twitter_username, twitter_username_updated_at")
      .eq("id", user.id)
      .single();

    if (fetchError) {
      console.error("Failed to fetch current profile", fetchError);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    // 7日制限チェック
    if (currentProfile?.twitter_username_updated_at) {
      const lastUpdated = new Date(currentProfile.twitter_username_updated_at).getTime();
      const now = Date.now();
      const daysSinceUpdate = Math.floor((now - lastUpdated) / (24 * 60 * 60 * 1000));

      if (now - lastUpdated < SEVEN_DAYS_MS) {
        const daysRemaining = 7 - daysSinceUpdate;
        return NextResponse.json(
          { 
            error: `Xアカウントは7日間変更できません。あと${daysRemaining}日後に変更可能です。`,
            canUpdateAt: new Date(lastUpdated + SEVEN_DAYS_MS).toISOString()
          },
          { status: 400 }
        );
      }
    }

    // ユニーク制約チェック（他のユーザーが同じユーザー名を使用していないか）
    const { data: existingUser, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("twitter_username", parsed.data.twitterUsername)
      .neq("id", user.id)
      .maybeSingle();

    if (checkError) {
      console.error("Failed to check existing username", checkError);
      return NextResponse.json({ error: "Failed to validate username" }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "このXアカウントは既に別のユーザーが登録しています" },
        { status: 400 }
      );
    }

    // 更新
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        twitter_username: parsed.data.twitterUsername,
        twitter_username_updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update Twitter username", updateError);
      return NextResponse.json({ error: "Failed to update Twitter account" }, { status: 500 });
    }

    return NextResponse.json({
      twitterUsername: parsed.data.twitterUsername,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
    }
    console.error("Unexpected error in Twitter profile update", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
