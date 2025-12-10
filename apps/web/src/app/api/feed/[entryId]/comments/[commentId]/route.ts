import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getRouteUser } from "@/lib/supabase/auth-helpers";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { entryId: string; commentId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const user = await getRouteUser(supabase, "Delete comment");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entryId, commentId } = params;
  const adminSupabase = getSupabaseAdminClient();

  try {
    // コメントの情報を取得
    const { data: comment, error: fetchError } = await adminSupabase
      .from("emotion_diary_comments")
      .select("commenter_user_id, entry_id")
      .eq("id", commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // 日記の投稿者を取得
    const { data: entry, error: entryError } = await adminSupabase
      .from("emotion_diary_entries")
      .select("user_id")
      .eq("id", entryId)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    // 削除権限チェック: コメント投稿者 または 日記投稿者
    const isCommentAuthor = comment.commenter_user_id === user.id;
    const isEntryAuthor = entry.user_id === user.id;

    if (!isCommentAuthor && !isEntryAuthor) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own comments or comments on your entries" },
        { status: 403 }
      );
    }

    // コメント削除
    const { error: deleteError } = await adminSupabase
      .from("emotion_diary_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      console.error("Failed to delete comment", deleteError);
      throw deleteError;
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
