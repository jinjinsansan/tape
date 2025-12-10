import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { entryId: string; commentId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response } = await ensureAdmin(supabase, "Delete comment");
  if (response) return response;

  const { commentId } = params;
  const adminSupabase = getSupabaseAdminClient();

  try {
    const { error } = await adminSupabase
      .from("emotion_diary_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("Failed to delete comment", error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete comment", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
