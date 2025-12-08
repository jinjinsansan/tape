"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Lesson = {
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
  status: "locked" | "in_progress" | "completed";
  isUnlocked: boolean;
  note: string | null | undefined;
  quiz?: {
    id: string;
    passingScore: number;
    questions: {
      id: string;
      question: string;
      choices: { id: string; label: string }[];
    }[];
    attempt?: {
      score: number;
      passed: boolean;
      createdAt: string;
    } | null;
  } | null;
};

type CourseData = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  heroUrl: string | null;
  level: string | null;
  tags: string[] | null;
  totalDurationSeconds: number | null;
  modules: {
    id: string;
    orderIndex: number;
    title: string;
    summary: string | null;
    lessons: Lesson[];
  }[];
  stats: {
    totalLessons: number;
    completedLessons: number;
    percentage: number;
  };
  viewer: {
    authenticated: boolean;
  };
};

type ApiResponse = {
  course: CourseData;
};

type NoteDrafts = Record<string, string>;
type QuizDrafts = Record<string, Record<string, string>>;

const formatDuration = (seconds?: number | null) => {
  if (!seconds || Number.isNaN(seconds)) return "-";
  const minutes = Math.round(seconds / 60);
  return `${minutes}分`;
};

const findInitialLesson = (course: CourseData | null) => {
  if (!course) return null;
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      if (lesson.isUnlocked) {
        return lesson.id;
      }
    }
  }
  return course.modules[0]?.lessons[0]?.id ?? null;
};

const extractLesson = (course: CourseData | null, lessonId: string | null): Lesson | null => {
  if (!course || !lessonId) return null;
  for (const module of course.modules) {
    const lesson = module.lessons.find((item) => item.id === lessonId);
    if (lesson) return lesson;
  }
  return null;
};

const extractAdjacentLesson = (course: CourseData | null, lessonId: string | null, direction: "next" | "prev") => {
  if (!course || !lessonId) return null;
  const ordered = course.modules.flatMap((module) => module.lessons);
  const index = ordered.findIndex((lesson) => lesson.id === lessonId);
  if (index === -1) return null;
  return direction === "next" ? ordered[index + 1] ?? null : ordered[index - 1] ?? null;
};

export function CourseClient({ slug }: { slug: string }) {
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<NoteDrafts>({});
  const [quizDrafts, setQuizDrafts] = useState<QuizDrafts>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [authWarning, setAuthWarning] = useState(false);

  const fetchCourse = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${slug}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("コースが見つかりません");
        }
        throw new Error("コース情報の取得に失敗しました");
      }
      const data = (await res.json()) as ApiResponse;
      setCourse(data.course);
      setActiveLessonId(findInitialLesson(data.course));
      setAuthWarning(!data.course.viewer.authenticated);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "不明なエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  useEffect(() => {
    if (!course) return;
    setNoteDrafts(() => {
      const drafts: NoteDrafts = {};
      course.modules.forEach((module) =>
        module.lessons.forEach((lesson) => {
          drafts[lesson.id] = lesson.note ?? "";
        })
      );
      return drafts;
    });
  }, [course]);

  const activeLesson = useMemo(() => extractLesson(course, activeLessonId), [course, activeLessonId]);
  const nextLesson = useMemo(() => extractAdjacentLesson(course, activeLessonId, "next"), [course, activeLessonId]);
  const prevLesson = useMemo(() => extractAdjacentLesson(course, activeLessonId, "prev"), [course, activeLessonId]);

  const viewerCanInteract = course?.viewer.authenticated ?? false;

  const handleLessonSelect = (lesson: Lesson) => {
    if (!lesson.isUnlocked || !viewerCanInteract) {
      setAuthWarning(!viewerCanInteract);
      return;
    }
    setActiveLessonId(lesson.id);
  };

  const performMutation = useCallback(
    async (url: string, options: RequestInit) => {
      setPendingAction(url);
      setError(null);
      try {
        const res = await fetch(url, options);
        if (res.status === 401) {
          setAuthWarning(true);
          throw new Error("ログインが必要です");
        }
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error ?? "操作に失敗しました");
        }
        const data = (await res.json()) as ApiResponse;
        setCourse(data.course);
        setAuthWarning(!data.course.viewer.authenticated);
        if (!activeLessonId) {
          setActiveLessonId(findInitialLesson(data.course));
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "操作に失敗しました");
      } finally {
        setPendingAction(null);
      }
    },
    [activeLessonId]
  );

  const handleCompleteLesson = async () => {
    if (!course || !activeLesson) return;
    await performMutation(`/api/courses/${slug}/lessons/${activeLesson.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" })
    });
  };

  const handleSaveNote = async () => {
    if (!course || !activeLesson) return;
    const content = noteDrafts[activeLesson.id] ?? "";
    if (!content.trim()) {
      setError("ノート本文を入力してください");
      return;
    }
    await performMutation(`/api/courses/${slug}/lessons/${activeLesson.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
  };

  const handleQuizSelect = (lessonId: string, questionId: string, choiceId: string) => {
    setQuizDrafts((prev) => ({
      ...prev,
      [lessonId]: {
        ...(prev[lessonId] ?? {}),
        [questionId]: choiceId
      }
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!course || !activeLesson || !activeLesson.quiz) return;
    const answers = activeLesson.quiz.questions.map((question) => ({
      questionId: question.id,
      choiceId: quizDrafts[activeLesson.id]?.[question.id]
    }));

    if (answers.some((answer) => !answer.choiceId)) {
      setError("全ての設問に回答してから送信してください");
      return;
    }

    await performMutation(`/api/courses/${slug}/lessons/${activeLesson.id}/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers })
    });
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-slate-500">
        コース情報を読み込んでいます...
      </main>
    );
  }

  if (error && !course) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm text-rose-500">{error}</p>
        <button
          type="button"
          onClick={fetchCourse}
          className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white"
        >
          再読み込み
        </button>
      </main>
    );
  }

  if (!course) return null;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10">
      <section className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-rose-50/60 p-8 shadow-xl shadow-rose-100/60">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-4">
            <p className="text-xs font-semibold tracking-[0.4em] text-rose-500">BEGINNER COURSE</p>
            <h1 className="text-3xl font-black text-slate-900">{course.title}</h1>
            <p className="text-sm text-slate-600">{course.subtitle ?? course.description}</p>
            <div className="flex flex-wrap gap-3">
              {course.tags?.map((tag) => (
                <span key={tag} className="rounded-full bg-white/70 px-3 py-1 text-xs text-rose-500 shadow">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="grid flex-shrink-0 grid-cols-2 gap-4 text-center text-xs">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <p className="text-slate-400">完了レッスン</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{course.stats.completedLessons}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <p className="text-slate-400">進捗率</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{course.stats.percentage}%</p>
            </div>
          </div>
        </div>
        {authWarning && (
          <p className="mt-4 rounded-2xl bg-white/80 px-4 py-2 text-xs text-rose-500">
            ログインするとレッスンの視聴・進捗管理・ノート作成ができます。
          </p>
        )}
        {error && (
          <p className="mt-3 text-xs text-rose-500">{error}</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="space-y-4 rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-lg shadow-slate-200/60">
          {course.modules.map((module) => (
            <div key={module.id}>
              <p className="text-xs font-semibold text-slate-500">{module.title}</p>
              <p className="text-[11px] text-slate-400">{module.summary}</p>
              <div className="mt-3 space-y-2">
                {module.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => handleLessonSelect(lesson)}
                    className={`w-full rounded-2xl border px-3 py-2 text-left text-xs transition ${
                      lesson.id === activeLessonId
                        ? "border-rose-200 bg-rose-50 text-rose-600"
                        : lesson.isUnlocked
                        ? "border-slate-200 bg-white hover:border-rose-200"
                        : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  >
                    <span className="font-semibold">{lesson.title}</span>
                    <span className="ml-2 text-[10px] text-slate-400">{formatDuration(lesson.videoDurationSeconds)}</span>
                    <div className="mt-1 text-[10px] text-slate-400">
                      {lesson.status === "completed" ? "✓ 完了済み" : lesson.isUnlocked ? "進行中" : "ロック中"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
          {activeLesson ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-rose-500">LESSON</p>
                <h2 className="text-2xl font-black text-slate-900">{activeLesson.title}</h2>
                <p className="text-sm text-slate-500">{activeLesson.summary}</p>
              </div>

              {activeLesson.videoUrl ? (
                <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-100 shadow-inner">
                  {activeLesson.videoUrl.includes("youtube.com") ? (
                    <iframe
                      src={activeLesson.videoUrl}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={activeLesson.title}
                    />
                  ) : (
                    <video controls className="h-full w-full" src={activeLesson.videoUrl} />
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-400">
                  動画は準備中です。
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-xs">
                {prevLesson && (
                  <button
                    type="button"
                    onClick={() => setActiveLessonId(prevLesson.id)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-slate-500"
                  >
                    ← 前のレッスン
                  </button>
                )}
                {nextLesson && (
                  <button
                    type="button"
                    onClick={() => setActiveLessonId(nextLesson.id)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-slate-500"
                  >
                    次のレッスン →
                  </button>
                )}
                <button
                  type="button"
                  disabled={!viewerCanInteract || !activeLesson.isUnlocked || pendingAction !== null}
                  onClick={handleCompleteLesson}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  レッスン完了にする
                </button>
              </div>

              <div className="rounded-2xl border border-slate-100 p-4">
                <h3 className="text-sm font-semibold text-slate-700">セルフノート</h3>
                <textarea
                  value={noteDrafts[activeLesson.id] ?? ""}
                  onChange={(event) =>
                    setNoteDrafts((prev) => ({
                      ...prev,
                      [activeLesson.id]: event.target.value
                    }))
                  }
                  placeholder="気づきや次のアクションをメモ"
                  className="mt-3 h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-200 focus:outline-none"
                  disabled={!viewerCanInteract || !activeLesson.isUnlocked}
                />
                <div className="mt-3 text-right">
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={!viewerCanInteract || !activeLesson.isUnlocked || pendingAction !== null}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    ノートを保存
                  </button>
                </div>
              </div>

              {activeLesson.quiz && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                  <h3 className="text-sm font-semibold text-rose-600">理解度チェック</h3>
                  <p className="text-xs text-rose-500">合格ライン: {activeLesson.quiz.passingScore}%</p>
                  <div className="mt-4 space-y-4 text-sm text-slate-700">
                    {activeLesson.quiz.questions.map((question, index) => (
                      <div key={question.id} className="space-y-2 rounded-2xl bg-white/80 p-3">
                        <p className="font-semibold text-slate-700">
                          Q{index + 1}. {question.question}
                        </p>
                        <div className="space-y-2">
                          {question.choices.map((choice) => (
                            <label key={choice.id} className="flex cursor-pointer items-center gap-2 text-xs">
                              <input
                                type="radio"
                                name={`${activeLesson.id}-${question.id}`}
                                value={choice.id}
                                checked={quizDrafts[activeLesson.id]?.[question.id] === choice.id}
                                onChange={() => handleQuizSelect(activeLesson.id, question.id, choice.id)}
                                disabled={!viewerCanInteract || !activeLesson.isUnlocked || Boolean(activeLesson.quiz?.attempt?.passed)}
                              />
                              <span>{choice.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {activeLesson.quiz.attempt && (
                    <p className="mt-3 text-xs font-semibold text-slate-600">
                      最終スコア: {activeLesson.quiz.attempt.score}% / {activeLesson.quiz.attempt.passed ? "合格" : "未合格"}
                    </p>
                  )}
                  <div className="mt-4 text-right">
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      disabled={!viewerCanInteract || !activeLesson.isUnlocked || pendingAction !== null}
                      className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-rose-300"
                    >
                      クイズを送信
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">表示するレッスンを選択してください。</p>
          )}
        </section>
      </div>
    </main>
  );
}
