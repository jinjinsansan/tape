import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@tape/supabase";

import { addDaysToDateString, getTodayJstDate } from "@/lib/date/jst";

import { SELF_ESTEEM_HISTORY_WINDOW_DAYS, SELF_ESTEEM_MIN_NEGATIVE_COUNT } from "./constants";
import { SELF_ESTEEM_CATEGORIES, SELF_ESTEEM_QUESTIONS } from "./questions";
import type { SelfEsteemQuestion } from "./types";

type Supabase = SupabaseClient<Database>;

const QUESTIONS_BY_CATEGORY = SELF_ESTEEM_CATEGORIES.reduce<Record<string, SelfEsteemQuestion[]>>(
  (acc, category) => {
    acc[category] = SELF_ESTEEM_QUESTIONS.filter((question) => question.category === category);
    return acc;
  },
  {}
);

const NEGATIVE_BY_CATEGORY = SELF_ESTEEM_CATEGORIES.reduce<Record<string, SelfEsteemQuestion[]>>(
  (acc, category) => {
    acc[category] = QUESTIONS_BY_CATEGORY[category].filter((question) => question.type === "N");
    return acc;
  },
  {}
);

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pickRandom = <T,>(items: T[]): T | null => {
  if (!items.length) return null;
  const index = Math.floor(Math.random() * items.length);
  return items[index];
};

const fetchRecentQuestionIds = async (supabase: Supabase, userId: string, sinceDate: string) => {
  const { data, error } = await supabase
    .from("self_esteem_question_history")
    .select("question_id")
    .eq("user_id", userId)
    .gte("shown_date", sinceDate);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.question_id));
};

const pickNegativeQuestionFromCategory = (
  category: string,
  recentIds: Set<string>,
  usedIds: Set<string>
) => {
  const pool = NEGATIVE_BY_CATEGORY[category].filter(
    (question) => !recentIds.has(question.id) && !usedIds.has(question.id)
  );
  if (pool.length) {
    return pickRandom(pool);
  }

  const fallbackPool = NEGATIVE_BY_CATEGORY[category].filter((question) => !usedIds.has(question.id));
  if (fallbackPool.length) {
    return pickRandom(fallbackPool);
  }

  return null;
};

export const selectQuestionsForUser = async (supabase: Supabase, userId: string): Promise<{
  questions: SelfEsteemQuestion[];
  testDate: string;
}> => {
  const testDate = getTodayJstDate();
  const sinceDate = addDaysToDateString(testDate, -SELF_ESTEEM_HISTORY_WINDOW_DAYS);
  const recentIds = await fetchRecentQuestionIds(supabase, userId, sinceDate);
  const usedIds = new Set<string>();

  const categories = shuffle([...SELF_ESTEEM_CATEGORIES]).slice(0, 5);
  const selected: SelfEsteemQuestion[] = [];

  for (const category of categories) {
    const picked = pickNegativeQuestionFromCategory(category, recentIds, usedIds);
    if (picked) {
      selected.push(picked);
      usedIds.add(picked.id);
    }
  }

  if (selected.length < categories.length) {
    const remaining = categories.length - selected.length;
    const pool = SELF_ESTEEM_QUESTIONS.filter(
      (question) => question.type === "N" && !usedIds.has(question.id)
    );
    for (let i = 0; i < remaining; i += 1) {
      const fallback = pickRandom(pool);
      if (!fallback) break;
      selected.push(fallback);
      usedIds.add(fallback.id);
      const index = pool.findIndex((question) => question.id === fallback.id);
      if (index >= 0) {
        pool.splice(index, 1);
      }
    }
  }

  if (selected.length < SELF_ESTEEM_MIN_NEGATIVE_COUNT) {
    throw new Error("Failed to assemble required number of negative questions");
  }

  return {
    questions: shuffle(selected).slice(0, SELF_ESTEEM_MIN_NEGATIVE_COUNT),
    testDate
  };
};
