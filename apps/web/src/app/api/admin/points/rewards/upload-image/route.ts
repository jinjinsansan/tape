import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";
import { getSupabaseAdminClient } from "@/server/supabase";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PUBLIC_PATH_PREFIX = "/storage/v1/object/public/reward-images/";

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response, user } = await ensureAdmin(supabase, "Upload reward image");
  if (response) return response;

  const formData = await request.formData();
  const imageFile = formData.get("image");

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 });
  }

  if (imageFile.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "画像は5MB以下にしてください" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(imageFile.type)) {
    return NextResponse.json(
      { error: "PNG、JPEG、WebP形式の画像のみ対応しています" },
      { status: 400 }
    );
  }

  try {
    const extension = imageFile.name.split(".").pop() ?? "jpg";
    const storagePath = `rewards/${randomUUID()}.${extension}`;
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const adminClient = getSupabaseAdminClient();
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from("reward-images")
      .upload(storagePath, buffer, {
        contentType: imageFile.type,
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("[Upload Reward Image] Storage upload failed:", uploadError);
      return NextResponse.json({ 
        error: `画像のアップロードに失敗しました: ${uploadError.message}` 
      }, { status: 500 });
    }

    const { data: publicUrlData } = adminClient.storage
      .from("reward-images")
      .getPublicUrl(uploadData.path);

    return NextResponse.json({ imageUrl: publicUrlData.publicUrl }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Upload Reward Image] Failed:", errorMessage, error);
    return NextResponse.json({ 
      error: `画像のアップロードに失敗しました: ${errorMessage}` 
    }, { status: 500 });
  }
}
