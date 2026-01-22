import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@tape/supabase";
import { getSupabaseAdminClient } from "@/server/supabase";
import { fetchDiaryCountsForUsers, fetchDiaryCountForUser } from "@/server/utils/diary-counts";
import { getAvatarPublicUrl } from "@/lib/supabase/storage";

type Supabase = SupabaseClient<Database>;

export type FeedEntry = {
  id: string;
  title: string | null;
  content: string;
  publishedAt: string;
  journalDate: string;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string | null;
    diaryCount: number;
  };
  feelings: {
    label: string;
    intensity: number;
  }[];
  moodScore: number | null;
  moodLabel: string | null;
  moodColor: string | null;
  eventSummary: string | null;
  realization: string | null;
  reactions: {
    counts: Record<string, number>;
    viewerReaction: string | null;
    total: number;
  };
  aiComment: { content: string; generatedAt: string | null } | null;
  counselorComment: { content: string; author: string } | null;
  isShareable: boolean;
  shareCount: number;
  commentCount: number;
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
        title,
        content,
        mood_score,
        mood_label,
        mood_color,
        emotion_label,
        event_summary,
        realization,
        ai_comment,
        ai_comment_status,
        ai_comment_generated_at,
        is_ai_comment_public,
        is_counselor_comment_public,
        is_shareable,
        share_count,
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
    .select("id, display_name, avatar_url, role")
    .in("id", userIds);

  const profilesMap = new Map(
    (profilesData ?? []).map((profile) => [profile.id, profile])
  );

  const diaryCountsMap = await fetchDiaryCountsForUsers(supabase, userIds);

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
      title: item.title,
      publishedAt: item.published_at ?? item.created_at,
      journalDate: item.journal_date,
      author: {
        id: item.user_id,
        displayName: profile?.display_name ?? "匿名ユーザー",
        avatarUrl: getAvatarPublicUrl(supabase, profile?.avatar_url ?? null),
        role: profile?.role ?? null,
        diaryCount: diaryCountsMap.get(item.user_id) ?? 0
      },
      feelings: (item.feelings ?? []).map((feeling) => ({
        label: feeling.label,
        intensity: feeling.intensity
      })),
      moodScore: item.mood_score,
      moodLabel: item.mood_label || item.emotion_label,
      moodColor: item.mood_color,
      eventSummary: item.event_summary,
      realization: item.realization,
      reactions: buildReactionSummary(item.reactions ?? [], params.viewerId),
      aiComment,
      counselorComment,
      isShareable: item.is_shareable ?? false,
      shareCount: item.share_count ?? 0,
      commentCount: 0
    };
  }) as FeedEntry[];

  const hasNext = entries.length > limit;
  const slicedEntries = hasNext ? entries.slice(0, limit) : entries;
  const entryIds = slicedEntries.map((entry) => entry.id);

  if (entryIds.length > 0) {
    const { data: commentRows, error: commentsError } = await supabase
      .from("emotion_diary_comments")
      .select("entry_id")
      .in("entry_id", entryIds)
      .eq("source", "user");

    if (!commentsError && commentRows) {
      const counts: Record<string, number> = {};
      commentRows.forEach((row) => {
        counts[row.entry_id] = (counts[row.entry_id] ?? 0) + 1;
      });
      slicedEntries.forEach((entry) => {
        entry.commentCount = counts[entry.id] ?? 0;
      });
    }
  }

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

export const getPublicFeedEntryById = async (entryId: string, viewerId?: string | null) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("emotion_diary_entries")
    .select(
      `
        id,
        user_id,
        title,
        content,
        mood_score,
        mood_label,
        mood_color,
        emotion_label,
        event_summary,
        realization,
        ai_comment,
        ai_comment_status,
        ai_comment_generated_at,
        is_ai_comment_public,
        is_counselor_comment_public,
        is_shareable,
        share_count,
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
    .eq("id", entryId)
    .eq("visibility", "public")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role")
    .eq("id", data.user_id)
    .maybeSingle();

  const diaryCount = await fetchDiaryCountForUser(supabase, data.user_id);

  const aiComment =
    data.is_ai_comment_public && data.ai_comment_status === "completed" && data.ai_comment
      ? { content: data.ai_comment, generatedAt: data.ai_comment_generated_at }
      : null;
  const counselorComment =
    data.is_counselor_comment_public && data.counselor_memo && data.counselor_name && data.is_visible_to_user
      ? { content: data.counselor_memo, author: data.counselor_name }
      : null;

  return {
    id: data.id,
    title: data.title,
    content: data.content,
    publishedAt: data.published_at ?? data.created_at,
    journalDate: data.journal_date,
    author: {
      id: data.user_id,
      displayName: profileData?.display_name ?? "匿名ユーザー",
      avatarUrl: getAvatarPublicUrl(supabase, profileData?.avatar_url ?? null),
      role: profileData?.role ?? null,
      diaryCount
    },
    feelings: (data.feelings ?? []).map((feeling) => ({
      label: feeling.label,
      intensity: feeling.intensity
    })),
    moodScore: data.mood_score,
    moodLabel: data.mood_label || data.emotion_label,
    moodColor: data.mood_color,
    eventSummary: data.event_summary,
    realization: data.realization,
    reactions: buildReactionSummary(data.reactions ?? [], viewerId),
    aiComment,
    counselorComment,
    isShareable: data.is_shareable ?? false,
    shareCount: data.share_count ?? 0,
    commentCount: 0
  } satisfies FeedEntry;
};

export const incrementFeedShareCount = async (entryId: string) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("increment_diary_share_count", {
    target_entry_id: entryId
  });
  if (error) {
    throw error;
  }
  return data;
};
