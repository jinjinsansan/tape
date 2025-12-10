import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response } = await ensureAdmin(supabase, "Admin feed comments");
  if (response) return response;

  const { entryId } = params;
  const adminSupabase = getSupabaseAdminClient();

  try {
    const { data: comments, error } = await adminSupabase
      .from("emotion_diary_comments")
      .select(
        `
          id,
          content,
          created_at,
          commenter_user_id,
          profiles:profiles!emotion_diary_comments_commenter_user_id_fkey(display_name)
        `
      )
      .eq("entry_id", entryId)
      .eq("source", "user")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch comments", error);
      throw error;
    }

    const formattedComments = (comments || []).map((comment) => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      commenter_name: comment.profiles?.display_name || "匿名ユーザー"
    }));

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error("Failed to load comments", error);
    return NextResponse.json(
      { error: "Failed to load comments" },
      { status: 500 }
    );
  }
}
