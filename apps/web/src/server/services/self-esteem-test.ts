import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@tape/supabase";

import { getJstIsoNow, getTodayJstDate } from "@/lib/date/jst";
import { SELF_ESTEEM_QUESTION_MAP } from "@/lib/self-esteem/questions";
import { selectQuestionsForUser } from "@/lib/self-esteem/question-selector";
import { calculateSelfEsteemScore, calculateWorthlessnessScore } from "@/lib/self-esteem/score";
import type {
  AnswerPayload,
  DiaryDraftPayload,
  SelfEsteemQuestion,
  SelfEsteemSubmitResponse,
  SelfEsteemTestStatus
} from "@/lib/self-esteem/types";

type Supabase = SupabaseClient<Database>;

export const SELF_ESTEEM_TEST_ALREADY_POSTED = "SELF_ESTEEM_TEST_ALREADY_POSTED";

type ScoreSnapshot = {
  date: string;
  selfEsteemScore: number;
  worthlessnessScore: number;
  source: "entry" | "test";
  createdAt: string;
};

const mapAnswersToQuestions = (answers: AnswerPayload[]): SelfEsteemQuestion[] => {
  return answers.map((answer) => {
    const question = SELF_ESTEEM_QUESTION_MAP.get(answer.questionId);
    if (!question) {
      throw new Error(`Unknown question id: ${answer.questionId}`);
    }
    return question;
  });
};

const fetchResultForDate = async (supabase: Supabase, userId: string, date: string) => {
  const { data, error } = await supabase
    .from("self_esteem_test_results")
    .select("*")
    .eq("user_id", userId)
    .eq("test_date", date)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const mapEntryToSnapshot = (
  entry: Pick<Database["public"]["Tables"]["emotion_diary_entries"]["Row"], "journal_date" | "self_esteem_score" | "worthlessness_score" | "created_at">
): ScoreSnapshot | null => {
  if (entry.self_esteem_score == null || entry.worthlessness_score == null) {
    return null;
  }
  return {
    date: entry.journal_date,
    selfEsteemScore: entry.self_esteem_score,
    worthlessnessScore: entry.worthlessness_score,
    source: "entry",
    createdAt: entry.created_at
  };
};

const mapTestToSnapshot = (
  result: Pick<Database["public"]["Tables"]["self_esteem_test_results"]["Row"], "test_date" | "self_esteem_score" | "worthlessness_score" | "completed_at" | "updated_at" | "created_at">
): ScoreSnapshot => {
  return {
    date: result.test_date,
    selfEsteemScore: result.self_esteem_score,
    worthlessnessScore: result.worthlessness_score,
    source: "test",
    createdAt: result.completed_at ?? result.updated_at ?? result.created_at
  };
};

const pickLatestSnapshot = (snapshots: Array<ScoreSnapshot | null>): ScoreSnapshot | null => {
  const valid = snapshots.filter((snapshot): snapshot is ScoreSnapshot => Boolean(snapshot));
  if (!valid.length) {
    return null;
  }
  return valid.sort((a, b) => {
    if (a.date === b.date) {
      return b.createdAt.localeCompare(a.createdAt);
    }
    return b.date.localeCompare(a.date);
  })[0];
};

const fetchSnapshotBeforeDate = async (supabase: Supabase, userId: string, beforeDate: string) => {
  const [entryResult, testResult] = await Promise.all([
    supabase
      .from("emotion_diary_entries")
      .select("journal_date,self_esteem_score,worthlessness_score,created_at")
      .eq("user_id", userId)
      .lt("journal_date", beforeDate)
      .is("deleted_at", null)
      .not("self_esteem_score", "is", null)
      .not("worthlessness_score", "is", null)
      .order("journal_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("self_esteem_test_results")
      .select("test_date,self_esteem_score,worthlessness_score,completed_at,updated_at,created_at")
      .eq("user_id", userId)
      .eq("is_posted_to_diary", true)
      .lt("test_date", beforeDate)
      .order("test_date", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (entryResult.error) {
    throw entryResult.error;
  }
  if (testResult.error) {
    throw testResult.error;
  }

  return pickLatestSnapshot([
    entryResult.data ? mapEntryToSnapshot(entryResult.data) : null,
    testResult.data ? mapTestToSnapshot(testResult.data) : null
  ]);
};

export const getTodayResult = (supabase: Supabase, userId: string) => {
  const testDate = getTodayJstDate();
  return fetchResultForDate(supabase, userId, testDate);
};

const recordQuestionHistory = async (supabase: Supabase, userId: string, questionIds: string[], date: string) => {
  if (!questionIds.length) return;

  const payload = questionIds.map((questionId) => ({
    user_id: userId,
    question_id: questionId,
    shown_date: date
  }));

  const { error } = await supabase
    .from("self_esteem_question_history")
    .upsert(payload as Database["public"]["Tables"]["self_esteem_question_history"]["Insert"][], {
      onConflict: "user_id,question_id,shown_date"
    });

  if (error) {
    throw error;
  }
};

const upsertResult = async (
  supabase: Supabase,
  userId: string,
  testDate: string,
  payload: {
    questionIds: string[];
    answers: AnswerPayload[];
    selfEsteemScore: number;
    worthlessnessScore: number;
  }
) => {
  const { data, error } = await supabase
    .from("self_esteem_test_results")
    .upsert(
      {
        user_id: userId,
        test_date: testDate,
        question_ids: payload.questionIds,
        answers: payload.answers as unknown as Json,
        self_esteem_score: payload.selfEsteemScore,
        worthlessness_score: payload.worthlessnessScore,
        completed_at: getJstIsoNow(),
        is_posted_to_diary: false
      },
      { onConflict: "user_id,test_date" }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const getSelfEsteemTestStatus = async (supabase: Supabase, userId: string): Promise<SelfEsteemTestStatus> => {
  const testDate = getTodayJstDate();
  const result = await fetchResultForDate(supabase, userId, testDate);
  const hasPostedToday = Boolean(result?.is_posted_to_diary);

  return {
    testDate,
    canTakeTest: !hasPostedToday,
    hasCompletedToday: Boolean(result),
    hasPostedToday,
    lastScore: result?.self_esteem_score ?? null
  };
};

export const getTodayQuestions = async (supabase: Supabase, userId: string) => {
  return selectQuestionsForUser(supabase, userId);
};

export const submitSelfEsteemAnswers = async (
  supabase: Supabase,
  userId: string,
  answers: AnswerPayload[]
): Promise<SelfEsteemSubmitResponse> => {
  if (answers.length !== 5) {
    throw new Error("Exactly 5 answers are required");
  }

  const testDate = getTodayJstDate();
  const existingResult = await fetchResultForDate(supabase, userId, testDate);
  if (existingResult?.is_posted_to_diary) {
    throw new Error(SELF_ESTEEM_TEST_ALREADY_POSTED);
  }

  const questions = mapAnswersToQuestions(answers);
  const selfEsteemScore = Math.round(calculateSelfEsteemScore(questions, answers));
  const worthlessnessScore = Math.round(calculateWorthlessnessScore(selfEsteemScore));

  await upsertResult(supabase, userId, testDate, {
    questionIds: questions.map((question) => question.id),
    answers,
    selfEsteemScore,
    worthlessnessScore
  });

  await recordQuestionHistory(supabase, userId, questions.map((question) => question.id), testDate);

  const previous = await fetchSnapshotBeforeDate(supabase, userId, testDate);

  return {
    selfEsteemScore,
    worthlessnessScore,
    previousDay: previous
      ? {
          date: previous.date,
          selfEsteemScore: previous.selfEsteemScore,
          worthlessnessScore: previous.worthlessnessScore
        }
      : null,
    comparison: previous
      ? {
          selfEsteemDiff: selfEsteemScore - previous.selfEsteemScore,
          worthlessnessDiff: worthlessnessScore - previous.worthlessnessScore
        }
      : null
  };
};

export const markResultPostedForDate = async (
  supabase: Supabase,
  userId: string,
  testDate: string,
  diaryEntryId: string
) => {
  const { error } = await supabase
    .from("self_esteem_test_results")
    .update({
      is_posted_to_diary: true,
      diary_entry_id: diaryEntryId
    })
    .eq("user_id", userId)
    .eq("test_date", testDate)
    .eq("is_posted_to_diary", false);

  if (error) {
    throw error;
  }
};

export const getDiaryDraftPayload = (
  testDate: string,
  selfEsteemScore: number,
  worthlessnessScore: number
): DiaryDraftPayload => {
  const [, month, day] = testDate.split("-");
  const header = `${Number(month)}月${Number(day)}日`;

  return {
    journalDate: testDate,
    testDate,
    content: `${header}\n\n自己肯定感スコア結果\n${selfEsteemScore}点`,
    eventSummary: "自己肯定感テストの振り返り",
    emotionLabel: selfEsteemScore >= 50 ? "嬉しい" : "無価値感",
    emotionType: selfEsteemScore >= 50 ? "positive" : "worthlessness",
    selfEsteemScore,
    worthlessnessScore,
    source: "self_esteem_test"
  };
};

export const getTodayResultSummary = async (
  supabase: Supabase,
  userId: string
): Promise<SelfEsteemSubmitResponse | null> => {
  const testDate = getTodayJstDate();
  const result = await fetchResultForDate(supabase, userId, testDate);
  if (!result) {
    return null;
  }
  const previous = await fetchSnapshotBeforeDate(supabase, userId, testDate);

  return {
    selfEsteemScore: result.self_esteem_score,
    worthlessnessScore: result.worthlessness_score,
    previousDay: previous
      ? {
          date: previous.date,
          selfEsteemScore: previous.selfEsteemScore,
          worthlessnessScore: previous.worthlessnessScore
        }
      : null,
    comparison: previous
      ? {
          selfEsteemDiff: result.self_esteem_score - previous.selfEsteemScore,
          worthlessnessDiff: result.worthlessness_score - previous.worthlessnessScore
        }
      : null
  };
};
