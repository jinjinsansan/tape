export type SelfEsteemCategory = "E" | "A" | "L" | "C" | "P" | "B";

export type SelfEsteemQuestionType = "P" | "N";

export type AnswerValue = 1 | 2 | 3 | 4 | 5;

export type SelfEsteemQuestion = {
  id: string;
  category: SelfEsteemCategory;
  type: SelfEsteemQuestionType;
  text: string;
};

export type AnswerPayload = {
  questionId: string;
  value: AnswerValue;
};

export type SelfEsteemSubmitResponse = {
  selfEsteemScore: number;
  worthlessnessScore: number;
  previousDay: {
    date: string;
    selfEsteemScore: number;
    worthlessnessScore: number;
  } | null;
  comparison: {
    selfEsteemDiff: number;
    worthlessnessDiff: number;
  } | null;
};

export type SelfEsteemTestStatus = {
  testDate: string;
  canTakeTest: boolean;
  hasCompletedToday: boolean;
  hasPostedToday: boolean;
  lastScore: number | null;
};

export type DiaryDraftPayload = {
  journalDate: string;
  testDate: string;
  content: string;
  emotionLabel: string;
  eventSummary: string;
  selfEsteemScore: number;
  worthlessnessScore: number;
  emotionType: "positive" | "worthlessness";
  source: "self_esteem_test";
};

export type DiaryDraftStorage = DiaryDraftPayload & {
  storedAt: string;
};
