import questionsData from "@/data/self-esteem/questions.json";

import type { SelfEsteemQuestion } from "./types";

const rawQuestions = (questionsData as { questions: SelfEsteemQuestion[] }).questions ?? [];

export const SELF_ESTEEM_QUESTIONS: SelfEsteemQuestion[] = rawQuestions.map((question) => ({
  ...question,
  id: question.id.trim(),
  text: question.text.trim()
}));

export const SELF_ESTEEM_QUESTION_MAP = new Map(SELF_ESTEEM_QUESTIONS.map((question) => [question.id, question]));

export const SELF_ESTEEM_CATEGORIES = ["E", "A", "L", "C", "P", "B"] as const;
