import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { Buffer } from "node:buffer";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { getSupabaseAdminClient } from "@/server/supabase";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PUBLIC_PATH_PREFIX = "/storage/v1/object/public/profile-avatars/";

const formatProfileResponse = (
  profile: { display_name: string | null; avatar_url: string | null } | null,
  user: { email?: string | null; user_metadata?: Record<string, unknown> }
) => ({
  displayName:
    profile?.display_name ??
    (typeof user.user_metadata?.full_name === "string" ? (user.user_metadata.full_name as string) : undefined) ??
    user.email ??
    null,
  avatarUrl: profile?.avatar_url ?? null,
  email: user.email ?? null
});

const getStoragePathFromPublicUrl = (url: string | null | undefined) => {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    const idx = parsed.pathname.indexOf(PUBLIC_PATH_PREFIX);
    if (idx === -1) {
      return null;
    }
    const relative = parsed.pathname.slice(idx + PUBLIC_PATH_PREFIX.length);
    return decodeURIComponent(relative);
  } catch {
    return null;
  }
};

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Profile GET");
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error.message);
      return NextResponse.json({ error: "プロフィールの取得に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ profile: formatProfileResponse(profile, user) }, { status: 200 });
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  let user;

  try {
    user = await getRouteUser(supabase, "Profile update");
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const rawDisplayName = formData.get("displayName");
  const avatarFile = formData.get("avatar");

  const displayName = typeof rawDisplayName === "string" ? rawDisplayName.trim() : undefined;

  if (!displayName && !(avatarFile instanceof File && avatarFile.size > 0)) {
    return NextResponse.json({ error: "更新する内容がありません" }, { status: 400 });
  }

  if (displayName && displayName.length > 50) {
    return NextResponse.json({ error: "ユーザー名は50文字以内で入力してください" }, { status: 400 });
  }

  let uploadedAvatarUrl: string | null = null;
  let newAvatarPath: string | null = null;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (avatarFile.size > MAX_AVATAR_SIZE) {
      return NextResponse.json({ error: "アイコン画像は2MB以下にしてください" }, { status: 400 });
    }

    if (avatarFile.type && !ALLOWED_MIME_TYPES.includes(avatarFile.type)) {
      return NextResponse.json({ error: "PNG / JPEG / WebP 形式の画像をご利用ください" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const extension = avatarFile.name?.split(".").pop()?.toLowerCase() || avatarFile.type?.split("/").pop() || "png";
    newAvatarPath = `${user.id}/${randomUUID()}.${extension}`;
    const fileBuffer = Buffer.from(await avatarFile.arrayBuffer());

    const { error: uploadError } = await admin.storage.from("profile-avatars").upload(newAvatarPath, fileBuffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: avatarFile.type || "image/png"
    });

    if (uploadError) {
      console.error("Avatar upload failed", uploadError.message);
      return NextResponse.json({ error: "アイコン画像のアップロードに失敗しました" }, { status: 500 });
    }

    const { data: publicUrl } = admin.storage.from("profile-avatars").getPublicUrl(newAvatarPath);
    uploadedAvatarUrl = publicUrl?.publicUrl ?? null;
  }

  const updates: { id: string; display_name?: string; avatar_url?: string } = { id: user.id };

  if (displayName) {
    updates.display_name = displayName;
  }

  if (uploadedAvatarUrl) {
    updates.avatar_url = uploadedAvatarUrl;
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "更新する内容がありません" }, { status: 400 });
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from("profiles")
    .upsert(updates, { onConflict: "id" })
    .select("display_name, avatar_url")
    .single();

  if (updateError) {
    console.error("Failed to update profile", updateError.message);
    return NextResponse.json({ error: "プロフィールの更新に失敗しました" }, { status: 500 });
  }

  if (uploadedAvatarUrl && existingProfile?.avatar_url) {
    const admin = getSupabaseAdminClient();
    const previousPath = getStoragePathFromPublicUrl(existingProfile.avatar_url);
    if (previousPath && previousPath !== newAvatarPath) {
      await admin.storage.from("profile-avatars").remove([previousPath]).catch((error) => {
        console.warn("Failed to remove old avatar", error?.message ?? error);
      });
    }
  }

  return NextResponse.json({ profile: formatProfileResponse(updatedProfile, user) }, { status: 200 });
}
