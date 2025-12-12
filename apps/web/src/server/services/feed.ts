import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@tape/supabase";
import { getSupabaseAdminClient } from "@/server/supabase";

type Supabase = SupabaseClient<Database>;

export type FeedEntry = {
  id: string;
  content: string;
  publishedAt: string;
  journalDate: string;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  feelings: {
    label: string;
    intensity: number;
  }[];
  moodScore: number | null;
  moodLabel: string | null;
  moodColor: string | null;
  reactions: {
    counts: Record<string, number>;
    viewerReaction: string | null;
    total: number;
  };
  aiComment: { content: string; generatedAt: string | null } | null;
  counselorComment: { content: string; author: string } | null;
};

type FeedQueryParams = {
  limit?: number;
  cursor?: string | null;
  viewerId?: string | null;
};

export const buildReactionSummary = (
  reactions: { reaction_type: string; user_id: string }[],
  viewerId?: string | null
) => {
  const counts: Record<string, number> = {};
  let viewerReaction: string | null = null;
  reactions.forEach((reaction) => {
    counts[reaction.reaction_type] = (counts[reaction.reaction_type] ?? 0) + 1;
    if (viewerId && reaction.user_id === viewerId) {
      viewerReaction = reaction.reaction_type;
    }
  });
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return { counts, viewerReaction, total };
};

export const listPublicFeed = async (params: FeedQueryParams) => {
  const supabase = getSupabaseAdminClient();
  const limit = params.limit ?? 10;
  const cursor = params.cursor;

  let query = supabase
    .from("emotion_diary_entries")
    .select(
      `
        id,
        user_id,
        content,
        mood_score,
        mood_label,
        mood_color,
        emotion_label,
        ai_comment,
        ai_comment_status,
        ai_comment_generated_at,
        is_ai_comment_public,
        is_counselor_comment_public,
        counselor_memo,
        counselor_name,
        is_visible_to_user,
        published_at,
        journal_date,
        created_at,
        feelings:emotion_diary_entry_feelings(label, intensity),
        reactions:emotion_diary_feed_reactions(reaction_type, user_id)
      `
    )
    .eq("visibility", "public")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("published_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  // ユーザーIDを収集してプロファイルを一括取得
  const userIds = [...new Set((data ?? []).map((item) => item.user_id))];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const profilesMap = new Map(
    (profilesData ?? []).map((profile) => [profile.id, profile])
  );

  const entries = (data ?? []).map((item) => {
    const profile = profilesMap.get(item.user_id);
    const aiComment =
      item.is_ai_comment_public && item.ai_comment_status === "completed" && item.ai_comment
        ? { content: item.ai_comment, generatedAt: item.ai_comment_generated_at }
        : null;
    const counselorComment =
      item.is_counselor_comment_public && item.counselor_memo && item.counselor_name && item.is_visible_to_user
        ? { content: item.counselor_memo, author: item.counselor_name }
        : null;
    return {
      id: item.id,
      content: item.content,
      publishedAt: item.published_at,
      journalDate: item.journal_date,
      author: {
        id: item.user_id,
        displayName: profile?.display_name ?? "匿名ユーザー",
        avatarUrl: profile?.avatar_url ?? null
      },
      feelings: (item.feelings ?? []).map((feeling) => ({
        label: feeling.label,
        intensity: feeling.intensity
      })),
      moodScore: item.mood_score,
      moodLabel: item.mood_label || item.emotion_label,
      moodColor: item.mood_color,
      reactions: buildReactionSummary(item.reactions ?? [], params.viewerId),
      aiComment,
      counselorComment
    };
  }) as FeedEntry[];

  const hasNext = entries.length > limit;
  const slicedEntries = hasNext ? entries.slice(0, limit) : entries;
  const nextCursor = hasNext ? slicedEntries[slicedEntries.length - 1]?.publishedAt ?? null : null;

  return { entries: slicedEntries, nextCursor };
};

export const reactToFeedEntry = async (entryId: string, userId: string, reactionType: string) => {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("emotion_diary_feed_reactions")
    .upsert({ entry_id: entryId, user_id: userId, reaction_type: reactionType }, { onConflict: "entry_id,user_id" });
  if (error) {
    throw error;
  }
};

export const removeFeedReaction = async (entryId: string, userId: string) => {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("emotion_diary_feed_reactions")
    .delete()
    .eq("entry_id", entryId)
    .eq("user_id", userId);
  if (error) {
    throw error;
  }
};

export const reportFeedEntry = async (entryId: string, userId: string, reason: string) => {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("emotion_diary_reports").insert({
    entry_id: entryId,
    reporter_user_id: userId,
    reason
  });
  if (error) {
    throw error;
  }
};
