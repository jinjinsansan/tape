import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@tape/supabase";

type Supabase = SupabaseClient<Database>;

export const fetchDiaryCountsForUsers = async (supabase: Supabase, userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const countsMap = new Map<string, number>();

  if (uniqueIds.length === 0) {
    return countsMap;
  }

  const { data, error } = await supabase
    .from("emotion_diary_entries")
    .select("user_id, diary_count:count(*)", { head: false })
    .in("user_id", uniqueIds)
    .is("deleted_at", null)
    .group("user_id");

  if (error) {
    throw error;
  }

  (data ?? []).forEach((row: { user_id: string; diary_count: number }) => {
    countsMap.set(row.user_id, Number(row.diary_count ?? 0));
  });

  uniqueIds.forEach((id) => {
    if (!countsMap.has(id)) {
      countsMap.set(id, 0);
    }
  });

  return countsMap;
};

export const fetchDiaryCountForUser = async (supabase: Supabase, userId: string) => {
  const { count, error } = await supabase
    .from("emotion_diary_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
};
