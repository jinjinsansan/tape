import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { awardPoints } from "@/server/services/points";
import { fetchDiaryCountsForUsers, fetchDiaryCountForUser } from "@/server/utils/diary-counts";
import { getAvatarPublicUrl } from "@/lib/supabase/storage";
import {
  sendDiaryCommentNotificationEmail,
  sendDiaryCommentReplyEmail
} from "@/server/emails";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://namisapo.app").replace(/\/$/, "");

type ApiCommentAuthor = {
  id: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: string | null;
  diaryCount: number;
};

type ApiCommentNode = {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  author: ApiCommentAuthor;
  replies: ApiCommentNode[];
};

const buildEntryTitle = (title: string | null, journalDate: string | null) => {
  if (title && title.trim().length > 0) {
    return title.trim();
  }
  if (!journalDate) {
    return "日記";
  }
  const date = new Date(journalDate);
  if (Number.isNaN(date.getTime())) {
    return "日記";
  }
  return `${date.getMonth() + 1}月${date.getDate()}日の日記`;
};

const buildCommentLink = (entryId: string, commentId: string) => `${SITE_URL}/feed/${entryId}#comment-${commentId}`;

const getUserEmail = async (adminSupabase: ReturnType<typeof getSupabaseAdminClient>, userId: string) => {
  try {
    const { data, error } = await adminSupabase.auth.admin.getUserById(userId);
    if (error) {
      console.error("Failed to fetch auth user", error);
      return null;
    }
    return data.user?.email ?? null;
  } catch (error) {
    console.error("Failed to fetch auth user", error);
    return null;
  }
};

const sendCommentNotifications = async (params: {
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>;
  entryId: string;
  entry: { user_id: string; title: string | null; journal_date: string | null };
  parentComment: { commenter_user_id: string | null } | null;
  comment: { id: string; content: string };
  commenterProfile: { display_name?: string | null } | null;
  commenterUserId: string;
}) => {
  const { adminSupabase, entryId, entry, parentComment, comment, commenterProfile, commenterUserId } = params;
  const commenterName = commenterProfile?.display_name || "匿名ユーザー";
  const commentSnippet = comment.content;
  const entryTitle = buildEntryTitle(entry.title, entry.journal_date);
  const entryUrl = buildCommentLink(entryId, comment.id);

  const tasks: Promise<void>[] = [];

  if (entry.user_id !== commenterUserId) {
    const email = await getUserEmail(adminSupabase, entry.user_id);
    if (email) {
      tasks.push(
        sendDiaryCommentNotificationEmail({
          to: email,
          entryTitle,
          commenterName,
          commentSnippet,
          entryUrl
        })
      );
    }
  }

  if (
    parentComment?.commenter_user_id &&
    parentComment.commenter_user_id !== commenterUserId &&
    parentComment.commenter_user_id !== entry.user_id
  ) {
    const email = await getUserEmail(adminSupabase, parentComment.commenter_user_id);
    if (email) {
      tasks.push(
        sendDiaryCommentReplyEmail({
          to: email,
          entryTitle,
          commenterName,
          commentSnippet,
          entryUrl
        })
      );
    }
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const { entryId } = params;
  const adminSupabase = getSupabaseAdminClient();

  try {
    // Limit to 100 most recent comments to prevent performance issues
    const { data: comments, error } = await adminSupabase
      .from("emotion_diary_comments")
      .select(
        `
          id,
          content,
          created_at,
          commenter_user_id,
          parent_id
        `
      )
      .eq("entry_id", entryId)
      .eq("source", "user")
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Failed to fetch comments", error);
      throw error;
    }

    // ユーザーIDを収集してプロファイルを一括取得
    const userIds = [...new Set((comments || []).map((c) => c.commenter_user_id).filter(Boolean) as string[])];
    const { data: profilesData } = await adminSupabase
      .from("profiles")
      .select("id, display_name, avatar_url, role")
      .in("id", userIds);

    const profilesMap = new Map(
      (profilesData || []).map((profile) => [profile.id, profile])
    );

    const diaryCountsMap = await fetchDiaryCountsForUsers(adminSupabase, userIds);

    const normalized: ApiCommentNode[] = (comments || []).map((comment) => {
      const profile = comment.commenter_user_id ? profilesMap.get(comment.commenter_user_id) : null;
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        parentId: comment.parent_id,
        author: {
          id: comment.commenter_user_id,
          displayName: profile?.display_name || "匿名ユーザー",
          avatarUrl: getAvatarPublicUrl(adminSupabase, profile?.avatar_url || null),
          role: profile?.role ?? null,
          diaryCount: comment.commenter_user_id ? diaryCountsMap.get(comment.commenter_user_id) ?? 0 : 0
        },
        replies: []
      };
    });

    const commentMap = new Map(normalized.map((item) => [item.id, item]));
    const roots: ApiCommentNode[] = [];

    normalized.forEach((comment) => {
      if (comment.parentId && commentMap.has(comment.parentId)) {
        commentMap.get(comment.parentId)!.replies.push(comment);
      } else {
        roots.push(comment);
      }
    });

    return NextResponse.json({ comments: roots });
  } catch (error) {
    console.error("Failed to load comments", error);
    return NextResponse.json(
      { error: "Failed to load comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const user = await getRouteUser(supabase, "Post comment");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entryId } = params;
  const body = await request.json();
  const { content, parentId } = body as { content?: string; parentId?: string | null };

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  if (parentId && typeof parentId !== "string") {
    return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
  }

  const adminSupabase = getSupabaseAdminClient();

  try {
    // 日記が存在し、公開されていることを確認
    const { data: entry, error: entryError } = await adminSupabase
      .from("emotion_diary_entries")
      .select("id, user_id, visibility, deleted_at, title, journal_date")
      .eq("id", entryId)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    if (entry.visibility !== "public") {
      return NextResponse.json(
        { error: "This entry is not public" },
        { status: 403 }
      );
    }

    if (entry.deleted_at) {
      return NextResponse.json(
        { error: "This entry has been deleted" },
        { status: 410 }
      );
    }

    let parentComment: { id: string; entry_id: string; commenter_user_id: string | null } | null = null;
    if (parentId) {
      const { data: parent, error: parentError } = await adminSupabase
        .from("emotion_diary_comments")
        .select("id, entry_id, commenter_user_id")
        .eq("id", parentId)
        .single();

      if (parentError || !parent) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }

      if (parent.entry_id !== entryId) {
        return NextResponse.json({ error: "Cannot reply across entries" }, { status: 400 });
      }

      parentComment = parent;
    }

    const { data: comment, error } = await adminSupabase
      .from("emotion_diary_comments")
      .insert({
        entry_id: entryId,
        commenter_user_id: user.id,
        source: "user",
        content: content.trim(),
        parent_id: parentId ?? null
      })
      .select("id, content, created_at, commenter_user_id, parent_id")
      .single();

    if (error) {
      console.error("Failed to create comment", error);
      throw error;
    }

    // プロファイル情報を別途取得
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("id, display_name, avatar_url, role")
      .eq("id", user.id)
      .single();

    const diaryCount = await fetchDiaryCountForUser(adminSupabase, user.id);

    const formattedComment = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
       parentId: comment.parent_id,
      author: {
        id: comment.commenter_user_id,
        displayName: profile?.display_name || "匿名ユーザー",
        avatarUrl: getAvatarPublicUrl(adminSupabase, profile?.avatar_url || null),
        role: profile?.role ?? null,
        diaryCount
      },
      replies: [] as ApiCommentNode[]
    };

    try {
      await awardPoints({ userId: user.id, action: "feed_comment", referenceId: entryId });
    } catch (awardError) {
      console.error("Failed to award comment points", awardError);
    }

    try {
      await sendCommentNotifications({
        adminSupabase,
        entryId,
        entry,
        parentComment,
        comment,
        commenterProfile: profile,
        commenterUserId: user.id
      });
    } catch (notifyError) {
      console.error("Failed to send diary comment notifications", notifyError);
    }

    return NextResponse.json({ comment: formattedComment });
  } catch (error) {
    console.error("Failed to post comment", error);
    return NextResponse.json(
      { error: "Failed to post comment" },
      { status: 500 }
    );
  }
}
