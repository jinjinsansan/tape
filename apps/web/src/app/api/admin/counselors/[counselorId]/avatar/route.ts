import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const paramsSchema = z.object({ counselorId: z.string().uuid() });

export async function POST(request: Request, context: { params: { counselorId: string } }) {
  const { counselorId } = paramsSchema.parse(context.params);
  
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { response } = await ensureAdmin(supabase, "Admin upload counselor avatar");
  if (response) return response;
  const adminSupabase = createSupabaseAdminClient();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalExt = file.name.includes(".") ? file.name.split(".").pop() : null;
    const mimeExt = file.type?.split("/").pop() ?? null;
    const fileExt = (originalExt || mimeExt || "jpg").toLowerCase();
    const fileName = `${timestamp}.${fileExt}`;
    const filePath = `${counselorId}/admin/${fileName}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await adminSupabase.storage
      .from("profile-avatars")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = adminSupabase.storage
      .from("profile-avatars")
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
