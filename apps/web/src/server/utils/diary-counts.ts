import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@tape/supabase";

type Supabase = SupabaseClient<Database>;

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

export const fetchDiaryCountsForUsers = async (supabase: Supabase, userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const countsMap = new Map<string, number>();

  if (uniqueIds.length === 0) {
    return countsMap;
  }

  await Promise.all(
    uniqueIds.map(async (id) => {
      const count = await fetchDiaryCountForUser(supabase, id);
      countsMap.set(id, count);
    })
  );

  return countsMap;
};
