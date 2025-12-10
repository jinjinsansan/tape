import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response } = await ensureAdmin(supabase, "Delete diary entry");
  if (response) return response;

  const { entryId } = params;
  const adminSupabase = getSupabaseAdminClient();

  try {
    // 日記が存在するか確認
    const { data: entry, error: fetchError } = await adminSupabase
      .from("emotion_diary_entries")
      .select("id")
      .eq("id", entryId)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    // 削除実行
    const { error } = await adminSupabase
      .from("emotion_diary_entries")
      .delete()
      .eq("id", entryId);

    if (error) {
      console.error("Failed to delete diary entry", error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete diary entry", error);
    return NextResponse.json(
      { error: "Failed to delete diary entry" },
      { status: 500 }
    );
  }
}
