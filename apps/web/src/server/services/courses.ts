import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  LearningLessonStatus
} from "@tape/supabase";
import { getSupabaseAdminClient } from "@/server/supabase";
import { isPrivilegedUser } from "@/server/services/roles";

export const INSTALLMENT_COURSE_CONFIGS = {
  "counselor-training": {
    lessonPriceYen: 6000,
    lessonPriceCents: 6000 * 100
  },
  "attraction-permit": {
    lessonPriceYen: 1500,
    lessonPriceCents: 1500 * 100
  }
} as const;

export type InstallmentCourseSlug = keyof typeof INSTALLMENT_COURSE_CONFIGS;

export const getInstallmentCourseConfig = (slug?: string | null) => {
  if (!slug) return null;
  return (INSTALLMENT_COURSE_CONFIGS as Record<string, (typeof INSTALLMENT_COURSE_CONFIGS)[InstallmentCourseSlug] | undefined>)[
    slug
  ] ?? null;
};

type Supabase = SupabaseClient<Database>;

type CourseModuleRecord = Database["public"]["Tables"]["learning_course_modules"]["Row"] & {
  lessons: (Database["public"]["Tables"]["learning_lessons"]["Row"] & {
    quiz: Database["public"]["Tables"]["learning_quizzes"]["Row"] | null;
  })[];
};

type CourseRecord = Database["public"]["Tables"]["learning_courses"]["Row"] & {
  modules: CourseModuleRecord[];
};

type LessonProgressRow = Database["public"]["Tables"]["learning_lesson_progress"]["Row"];
type LessonNoteRow = Database["public"]["Tables"]["learning_lesson_notes"]["Row"];
type QuizAttemptRow = Database["public"]["Tables"]["learning_quiz_attempts"]["Row"];

export class CourseNotFoundError extends Error {
  constructor(slug: string) {
    super(`Course not found: ${slug}`);
    this.name = "CourseNotFoundError";
  }
}

export class LessonAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LessonAccessError";
  }
}

export type QuizQuestion = {
  id: string;
  question: string;
  choices: { id: string; label: string }[];
};

export type LessonQuiz = {
  id: string;
  passingScore: number;
  questions: QuizQuestion[];
  attempt?: {
    score: number;
    passed: boolean;
    createdAt: string;
  } | null;
};

export type LessonViewModel = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  videoUrl: string | null;
  videoDurationSeconds: number | null;
  requiresQuiz: boolean;
  transcript: string | null;
  resources: unknown;
  orderIndex: number;
  status: LearningLessonStatus;
  isUnlocked: boolean;
  note?: string | null;
  quiz?: LessonQuiz | null;
};

export type CourseModuleViewModel = {
  id: string;
  orderIndex: number;
  title: string;
  summary: string | null;
  lessons: LessonViewModel[];
};

export type CourseViewModel = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  heroUrl: string | null;
  level: string | null;
  tags: string[] | null;
  totalDurationSeconds: number | null;
  modules: CourseModuleViewModel[];
  stats: {
    totalLessons: number;
    completedLessons: number;
    percentage: number;
  };
  viewer: {
    authenticated: boolean;
    isPrivileged: boolean;
    hasFullCourseAccess: boolean;
    unlockedLessonIds: string[];
  };
};

type LessonState = {
  status: LearningLessonStatus;
  isUnlocked: boolean;
};

type LessonUnlockOptions = {
  viewerAuthenticated: boolean;
  unlockedLessonIds: Set<string>;
  allowDefaultFirstLesson: boolean;
  allowSequentialUnlock: boolean;
  forceUnlockAll: boolean;
};

const parseQuizQuestions = (raw: unknown): QuizQuestion[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const id = typeof (item as Record<string, unknown>).id === "string" ? (item as Record<string, unknown>).id : null;
      const question = typeof (item as Record<string, unknown>).question === "string" ? (item as Record<string, unknown>).question : null;
      const rawChoices = (item as Record<string, unknown>).choices;
      if (!id || !question || !Array.isArray(rawChoices)) return null;
      const choices = rawChoices
        .map((choice) => {
          if (!choice || typeof choice !== "object") return null;
          const choiceId = typeof (choice as Record<string, unknown>).id === "string" ? (choice as Record<string, unknown>).id : null;
          const label = typeof (choice as Record<string, unknown>).label === "string" ? (choice as Record<string, unknown>).label : null;
          if (!choiceId || !label) return null;
          return { id: choiceId, label };
        })
        .filter(Boolean) as { id: string; label: string }[];
      if (!choices.length) return null;
      return { id, question, choices };
    })
    .filter(Boolean) as QuizQuestion[];
};

const fetchRawCourse = async (supabase: Supabase, slug: string): Promise<CourseRecord> => {
  const { data, error } = await supabase
    .from("learning_courses")
    .select(
      `
        id, slug, title, subtitle, description, hero_url, level, tags, total_duration_seconds, price, currency,
        modules:learning_course_modules(
          id, order_index, title, summary,
          lessons:learning_lessons(
            id, module_id, slug, order_index, title, summary, video_url, video_duration_seconds,
            requires_quiz, transcript, resources,
            quiz:learning_quizzes(id, passing_score, questions)
          )
        )
      `
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new CourseNotFoundError(slug);
  }

  return data as unknown as CourseRecord;
};

const getLessonIdsInOrder = (course: CourseRecord): string[] => {
  const lessons = course.modules
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .flatMap((module) => (module.lessons ?? []).slice().sort((a, b) => a.order_index - b.order_index));
  return lessons.map((lesson) => lesson.id);
};

const computeLessonStates = (
  orderedIds: string[],
  progressMap: Map<string, LessonProgressRow>,
  options: LessonUnlockOptions
): Map<string, LessonState> => {
  const states = new Map<string, LessonState>();

  orderedIds.forEach((lessonId, index) => {
    const prevLessonId = index > 0 ? orderedIds[index - 1] : null;
    const prevState = prevLessonId ? states.get(prevLessonId) : undefined;
    const progress = progressMap.get(lessonId);
    const unlockedByDefault = options.allowDefaultFirstLesson && index === 0;
    const unlockedByProgress = Boolean(progress && progress.status !== "locked");
    const unlockedByPrevious = options.allowSequentialUnlock && Boolean(prevState && prevState.status === "completed");
    const unlockedByPurchase = options.unlockedLessonIds.has(lessonId);
    const unlocked =
      options.forceUnlockAll || unlockedByPurchase || unlockedByDefault || unlockedByProgress || unlockedByPrevious;
    const isUnlocked = options.viewerAuthenticated ? unlocked : unlockedByDefault;
    const status: LearningLessonStatus = options.forceUnlockAll
      ? "in_progress"
      : progress?.status ?? (isUnlocked && options.viewerAuthenticated ? "in_progress" : "locked");
    states.set(lessonId, { status, isUnlocked: options.forceUnlockAll ? true : isUnlocked });
  });

  return states;
};

const buildCourseViewModel = (
  course: CourseRecord,
  options: {
    progressMap: Map<string, LessonProgressRow>;
    notesMap: Map<string, LessonNoteRow>;
    attemptsMap: Map<string, QuizAttemptRow>;
    viewer: {
      authenticated: boolean;
      isPrivileged: boolean;
      hasFullCourseAccess: boolean;
      unlockedLessonIds: string[];
    };
    unlockedLessonIds: Set<string>;
    allowDefaultFirstLesson: boolean;
    allowSequentialUnlock: boolean;
    forceUnlockAll: boolean;
  }
): CourseViewModel => {
  const orderedLessonIds = getLessonIdsInOrder(course);
  const lessonStates = computeLessonStates(orderedLessonIds, options.progressMap, {
    viewerAuthenticated: options.viewer.authenticated,
    unlockedLessonIds: options.unlockedLessonIds,
    allowDefaultFirstLesson: options.allowDefaultFirstLesson,
    allowSequentialUnlock: options.allowSequentialUnlock,
    forceUnlockAll: options.forceUnlockAll
  });

  const modules = course.modules
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((module) => {
      const lessons = (module.lessons ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((lesson) => {
          const state = lessonStates.get(lesson.id) ?? { status: "locked", isUnlocked: false };
          const progress = options.progressMap.get(lesson.id);
          const note = options.notesMap.get(lesson.id)?.content ?? null;
          const attempt = options.attemptsMap.get(lesson.id);
          const quizRow = lesson.quiz;
          const quiz: LessonQuiz | null = quizRow
            ? {
                id: quizRow.id,
                passingScore: quizRow.passing_score,
                questions: parseQuizQuestions(quizRow.questions),
                attempt: attempt
                  ? {
                      score: attempt.score,
                      passed: attempt.passed,
                      createdAt: attempt.created_at
                    }
                  : null
              }
            : null;

          return {
            id: lesson.id,
            slug: lesson.slug,
            title: lesson.title,
            summary: lesson.summary,
            videoUrl: lesson.video_url,
            videoDurationSeconds: lesson.video_duration_seconds,
            requiresQuiz: lesson.requires_quiz,
            transcript: lesson.transcript,
            resources: lesson.resources ?? [],
            orderIndex: lesson.order_index,
            status: state.status,
            isUnlocked: state.isUnlocked && options.viewer.authenticated,
            note,
            quiz
          } satisfies LessonViewModel;
        });

      return {
        id: module.id,
        orderIndex: module.order_index,
        title: module.title,
        summary: module.summary,
        lessons
      } satisfies CourseModuleViewModel;
    });

  const totalLessons = orderedLessonIds.length;
  const completedLessons = Array.from(options.progressMap.values()).filter((row) => row.status === "completed").length;
  const percentage = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    heroUrl: course.hero_url,
    level: course.level,
    tags: course.tags,
    totalDurationSeconds: course.total_duration_seconds,
    modules,
    stats: {
      totalLessons,
      completedLessons,
      percentage
    },
    viewer: options.viewer
  } satisfies CourseViewModel;
};

const fetchUserProgressMaps = async (
  supabase: Supabase,
  userId: string | null,
  lessonIds: string[]
) => {
  const progressMap = new Map<string, LessonProgressRow>();
  const notesMap = new Map<string, LessonNoteRow>();
  const attemptsMap = new Map<string, QuizAttemptRow>();

  if (!userId || !lessonIds.length) {
    return { progressMap, notesMap, attemptsMap };
  }

  const { data: progressRows, error: progressError } = await supabase
    .from("learning_lesson_progress")
    .select("lesson_id, status, last_position_seconds, completed_at, updated_at")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);

  if (progressError) {
    throw progressError;
  }

  (progressRows ?? []).forEach((row) => progressMap.set(row.lesson_id, row));

  const { data: notesRows, error: notesError } = await supabase
    .from("learning_lesson_notes")
    .select("lesson_id, content, created_at, updated_at")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);

  if (notesError) {
    throw notesError;
  }

  (notesRows ?? []).forEach((row) => notesMap.set(row.lesson_id, row));

  const { data: attemptsRows, error: attemptsError } = await supabase
    .from("learning_quiz_attempts")
    .select("lesson_id, quiz_id, score, total_questions, answers, passed, created_at")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);

  if (attemptsError) {
    throw attemptsError;
  }

  (attemptsRows ?? []).forEach((row) => attemptsMap.set(row.lesson_id, row));

  return { progressMap, notesMap, attemptsMap };
};

export const getCourseForUser = async (
  slug: string,
  userId?: string | null,
  options?: { isPrivileged?: boolean }
): Promise<CourseViewModel> => {
  const supabase = getSupabaseAdminClient();
  const course = await fetchRawCourse(supabase, slug);
  const orderedLessonIds = getLessonIdsInOrder(course);
  const { progressMap, notesMap, attemptsMap } = await fetchUserProgressMaps(supabase, userId ?? null, orderedLessonIds);

  const viewerAuthenticated = Boolean(userId);
  let isPrivileged = false;
  if (viewerAuthenticated) {
    if (typeof options?.isPrivileged === "boolean") {
      isPrivileged = options.isPrivileged;
    } else {
      isPrivileged = await isPrivilegedUser(userId!, supabase);
    }
  }

  let hasFullCourseAccess = course.price === 0;
  if (viewerAuthenticated && !hasFullCourseAccess) {
    if (isPrivileged) {
      hasFullCourseAccess = true;
    } else {
      const { data: purchaseRow, error: purchaseError } = await supabase
        .from("course_purchases")
        .select("id")
        .eq("user_id", userId!)
        .eq("course_id", course.id)
        .eq("status", "completed")
        .maybeSingle();

      if (purchaseError) {
        throw purchaseError;
      }

      hasFullCourseAccess = Boolean(purchaseRow);
    }
  }

  let unlockedLessonIds: string[] = [];
  if (viewerAuthenticated && !hasFullCourseAccess) {
    const { data: unlockedRows, error: unlockError } = await supabase
      .from("learning_lesson_unlocks")
      .select("lesson_id")
      .eq("user_id", userId!)
      .eq("course_id", course.id)
      .eq("status", "active");

    if (unlockError) {
      throw unlockError;
    }

    unlockedLessonIds = (unlockedRows ?? []).map((row) => row.lesson_id);
  }

  const strictInstallment = Boolean(getInstallmentCourseConfig(course.slug)) && !hasFullCourseAccess && !isPrivileged;
  const allowDefaultFirstLesson = !strictInstallment;
  const allowSequentialUnlock = !strictInstallment;
  const forceUnlockAll = isPrivileged;

  const viewerInfo = {
    authenticated: viewerAuthenticated,
    isPrivileged,
    hasFullCourseAccess,
    unlockedLessonIds
  } satisfies CourseViewModel["viewer"];

  return buildCourseViewModel(course, {
    progressMap,
    notesMap,
    attemptsMap,
    viewer: viewerInfo,
    unlockedLessonIds: new Set(unlockedLessonIds),
    allowDefaultFirstLesson,
    allowSequentialUnlock,
    forceUnlockAll
  });
};

const upsertLessonProgress = async (
  supabase: Supabase,
  userId: string,
  lessonId: string,
  updates: Partial<LessonProgressRow>
) => {
  const payload = {
    user_id: userId,
    lesson_id: lessonId,
    ...updates
  } as Database["public"]["Tables"]["learning_lesson_progress"]["Insert"];

  const { error } = await supabase.from("learning_lesson_progress").upsert(payload, { onConflict: "user_id,lesson_id" });
  if (error) {
    throw error;
  }
};

const findNextLessonId = (course: CourseViewModel, lessonId: string): string | null => {
  const ordered = course.modules.flatMap((module) => module.lessons);
  const index = ordered.findIndex((lesson) => lesson.id === lessonId);
  if (index === -1) return null;
  return ordered[index + 1]?.id ?? null;
};

export const recordLessonProgress = async (
  slug: string,
  lessonId: string,
  userId: string,
  params: { action: "complete" | "position"; positionSeconds?: number }
): Promise<CourseViewModel> => {
  const supabase = getSupabaseAdminClient();
  const courseBefore = await getCourseForUser(slug, userId);
  const lesson = courseBefore.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
  if (!lesson) {
    throw new LessonAccessError("Lesson not found in course");
  }
  if (!lesson.isUnlocked) {
    throw new LessonAccessError("Lesson is locked");
  }

  if (params.action === "position") {
    await upsertLessonProgress(supabase, userId, lessonId, {
      status: "in_progress",
      last_position_seconds: Math.max(0, params.positionSeconds ?? 0)
    });
  } else {
    await upsertLessonProgress(supabase, userId, lessonId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      last_position_seconds: 0
    });

    const nextLessonId = findNextLessonId(courseBefore, lessonId);
    const canAutoUnlockNext = courseBefore.viewer.hasFullCourseAccess || courseBefore.viewer.isPrivileged;
    if (canAutoUnlockNext && nextLessonId) {
      await upsertLessonProgress(supabase, userId, nextLessonId, {
        status: "in_progress",
        unlocked_at: new Date().toISOString()
      });
    }
  }

  return getCourseForUser(slug, userId);
};

export const saveLessonNote = async (
  slug: string,
  lessonId: string,
  userId: string,
  content: string
): Promise<CourseViewModel> => {
  const supabase = getSupabaseAdminClient();
  const course = await getCourseForUser(slug, userId);
  const lesson = course.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
  if (!lesson) {
    throw new LessonAccessError("Lesson not found in course");
  }
  if (!lesson.isUnlocked) {
    throw new LessonAccessError("Lesson is locked");
  }

  const { error } = await supabase.from("learning_lesson_notes").upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      content
    },
    { onConflict: "user_id,lesson_id" }
  );

  if (error) {
    throw error;
  }

  return getCourseForUser(slug, userId);
};

export type QuizAnswerPayload = {
  questionId: string;
  choiceId: string;
};

export const submitLessonQuiz = async (
  slug: string,
  lessonId: string,
  userId: string,
  answers: QuizAnswerPayload[]
): Promise<CourseViewModel> => {
  const supabase = getSupabaseAdminClient();
  const course = await getCourseForUser(slug, userId);
  const lesson = course.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
  if (!lesson) {
    throw new LessonAccessError("Lesson not found in course");
  }
  if (!lesson.isUnlocked) {
    throw new LessonAccessError("Lesson is locked");
  }
  if (!lesson.quiz) {
    throw new LessonAccessError("This lesson does not have a quiz");
  }

  // Re-fetch quiz with answers from DB
  const { data: quizRow, error: quizError } = await supabase
    .from("learning_quizzes")
    .select("id, lesson_id, passing_score, questions")
    .eq("id", lesson.quiz.id)
    .maybeSingle();

  if (quizError) {
    throw quizError;
  }
  if (!quizRow) {
    throw new LessonAccessError("Quiz not found");
  }

  const rawQuestions = Array.isArray(quizRow.questions) ? quizRow.questions : [];
  const totalQuestions = rawQuestions.length;
  if (totalQuestions === 0) {
    throw new LessonAccessError("Quiz is not configured correctly");
  }

  const answerMap = new Map<string, string>();
  answers.forEach((item) => {
    if (item.questionId && item.choiceId) {
      answerMap.set(item.questionId, item.choiceId);
    }
  });

  let correctCount = 0;
  rawQuestions.forEach((question: any) => {
    const qid = question?.id;
    const correct = question?.answer;
    if (typeof qid === "string" && typeof correct === "string") {
      if (answerMap.get(qid) === correct) {
        correctCount += 1;
      }
    }
  });

  const score = Math.round((correctCount / totalQuestions) * 100);
  const passed = score >= quizRow.passing_score;

  const { error: attemptError } = await supabase
    .from("learning_quiz_attempts")
    .upsert(
      {
        quiz_id: quizRow.id,
        lesson_id: lessonId,
        user_id: userId,
        score,
        total_questions: totalQuestions,
        answers,
        passed
      },
      { onConflict: "quiz_id,user_id" }
    );

  if (attemptError) {
    throw attemptError;
  }

  if (passed) {
    await upsertLessonProgress(supabase, userId, lessonId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      last_position_seconds: 0
    });

    const nextLessonId = findNextLessonId(course, lessonId);
    if (nextLessonId) {
      await upsertLessonProgress(supabase, userId, nextLessonId, {
        status: "in_progress",
        unlocked_at: new Date().toISOString()
      });
    }
  }

  return getCourseForUser(slug, userId);
};
