import type { AnswerPayload, SelfEsteemQuestion } from "./types";

const ANSWER_MIN = 1;
const ANSWER_MAX = 5;
const QUESTIONS_PER_TEST = 5;
const QUESTION_MAX_POINTS = 4;

export const scorePositive = (value: number) => value - 1;

export const scoreNegative = (value: number) => ANSWER_MAX - value;

export const calculateQuestionScore = (question: SelfEsteemQuestion, value: number) =>
  question.type === "P" ? scorePositive(value) : scoreNegative(value);

export const validateAnswerValue = (value: number): value is 1 | 2 | 3 | 4 | 5 =>
  Number.isInteger(value) && value >= ANSWER_MIN && value <= ANSWER_MAX;

export const calculateSelfEsteemScore = (questions: SelfEsteemQuestion[], answers: AnswerPayload[]) => {
  if (questions.length !== QUESTIONS_PER_TEST || answers.length !== QUESTIONS_PER_TEST) {
    throw new Error("Exactly 5 questions and answers are required");
  }

  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const totalPoints = answers.reduce((sum, answer) => {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      throw new Error(`Question ${answer.questionId} not found in question set`);
    }
    if (!validateAnswerValue(answer.value)) {
      throw new Error(`Invalid answer value for question ${answer.questionId}`);
    }
    return sum + calculateQuestionScore(question, answer.value);
  }, 0);

  return totalPoints * (100 / (QUESTIONS_PER_TEST * QUESTION_MAX_POINTS));
};

export const calculateWorthlessnessScore = (selfEsteemScore: number) => 100 - selfEsteemScore;

export const determineEmotionLabel = (selfEsteemScore: number) =>
  selfEsteemScore >= 50 ? "嬉しい" : "無価値感";

export const determineEmotionType = (selfEsteemScore: number): "positive" | "worthlessness" =>
  (selfEsteemScore >= 50 ? "positive" : "worthlessness");
