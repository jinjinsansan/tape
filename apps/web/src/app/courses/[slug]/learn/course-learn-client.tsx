"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PlayCircle, CheckCircle, Lock, FileText, ChevronRight, ChevronLeft } from "lucide-react";

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
    isPrivileged: boolean;
    hasFullCourseAccess: boolean;
    unlockedLessonIds: string[];
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

const resolveYoutubeId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      return parsed.pathname.replace("/", "");
    }
    if (host.endsWith("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.replace("/embed/", "");
      }
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments[0] === "shorts" && segments[1]) {
        return segments[1];
      }
    }
  } catch (error) {
    console.warn("Failed to parse video url", error);
  }
  return null;
};

const resolveVimeoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (host === "vimeo.com" && segments[0]) {
      return segments[0];
    }

    if (host === "player.vimeo.com" && segments[0] === "video" && segments[1]) {
      return segments[1];
    }
  } catch (error) {
    console.warn("Failed to parse Vimeo url", error);
  }
  return null;
};

type LessonVideoSource =
  | { type: "none"; src: null }
  | { type: "youtube" | "vimeo" | "file"; src: string };

const buildVideoSource = (url: string | null | undefined): LessonVideoSource => {
  if (!url) return { type: "none", src: null };

  const youtubeId = resolveYoutubeId(url);
  if (youtubeId) {
    return { type: "youtube", src: `https://www.youtube.com/embed/${youtubeId}` };
  }

  const vimeoId = resolveVimeoId(url);
  if (vimeoId) {
    return { type: "vimeo", src: `https://player.vimeo.com/video/${vimeoId}` };
  }

  return { type: "file", src: url };
};

const splitTextIntoPoints = (value: string): string[] =>
  value
    .split(/\r?\n|\u2028|\u2029/)
    .map((line) => line.replace(/^[-*・\u2022]\s?/, "").trim())
    .filter(Boolean);

const splitTextIntoParagraphs = (value?: string | null): string[] => {
  if (!value) return [];
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
};

const extractKeyPoints = (resources: unknown): string[] => {
  if (!resources) return [];

  if (Array.isArray(resources)) {
    return resources.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof resources === "string") {
    return splitTextIntoPoints(resources);
  }

  if (typeof resources === "object" && resources !== null) {
    const container = resources as { keyPoints?: unknown; key_points?: unknown; highlights?: unknown };
    const candidates = container.keyPoints ?? container.key_points ?? container.highlights;
    if (Array.isArray(candidates)) {
      return candidates.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
    if (typeof candidates === "string") {
      return splitTextIntoPoints(candidates);
    }
  }

  return [];
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

export function CourseLearnClient({ slug }: { slug: string }) {
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
  const activeLessonKeyPoints = useMemo(() => extractKeyPoints(activeLesson?.resources), [activeLesson?.resources]);
  const activeLessonSummaryParagraphs = useMemo(
    () => splitTextIntoParagraphs(activeLesson?.summary),
    [activeLesson?.summary]
  );
  const activeLessonVideo = useMemo(() => buildVideoSource(activeLesson?.videoUrl), [activeLesson?.videoUrl]);
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
      <main className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-tape-light-brown">
        コース情報を読み込んでいます...
      </main>
    );
  }

  if (error && !course) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm text-tape-pink">{error}</p>
        <Button onClick={fetchCourse} className="mt-4">
          再読み込み
        </Button>
      </main>
    );
  }

  if (!course) return null;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10">
      <section className="rounded-3xl border border-tape-beige bg-gradient-to-br from-white to-tape-orange/10 p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-4">
            <p className="text-xs font-semibold tracking-[0.4em] text-tape-orange">BEGINNER COURSE</p>
            <h1 className="text-3xl font-bold text-tape-brown">{course.title}</h1>
            <p className="text-sm text-tape-brown/80">{course.subtitle ?? course.description}</p>
            <div className="flex flex-wrap gap-3">
              {course.tags?.map((tag) => (
                <span key={tag} className="rounded-full bg-white/70 px-3 py-1 text-xs text-tape-orange shadow">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="grid flex-shrink-0 grid-cols-2 gap-4 text-center text-xs">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm border border-tape-beige">
              <p className="text-tape-light-brown">完了レッスン</p>
              <p className="mt-1 text-2xl font-bold text-tape-brown">{course.stats.completedLessons}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm border border-tape-beige">
              <p className="text-tape-light-brown">進捗率</p>
              <p className="mt-1 text-2xl font-bold text-tape-brown">{course.stats.percentage}%</p>
            </div>
          </div>
        </div>
        {authWarning && (
          <p className="mt-4 rounded-2xl bg-white/80 px-4 py-2 text-xs text-tape-pink">
            ログインするとレッスンの視聴・進捗管理・ノート作成ができます。
          </p>
        )}
        {error && (
          <p className="mt-3 text-xs text-tape-pink">{error}</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
        <aside className="h-fit space-y-4 rounded-3xl border border-tape-beige bg-white p-4 shadow-sm">
          {course.modules.map((module) => (
            <div key={module.id}>
              <p className="text-xs font-semibold text-tape-light-brown mb-2">{module.title}</p>
              <div className="space-y-2">
                {module.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => handleLessonSelect(lesson)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-left text-xs transition-all",
                      lesson.id === activeLessonId
                        ? "border-tape-orange bg-tape-orange/10 text-tape-brown shadow-sm"
                        : lesson.isUnlocked
                        ? "border-transparent hover:bg-tape-cream text-tape-brown"
                        : "border-transparent text-tape-light-brown/60 cursor-not-allowed"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold line-clamp-1">{lesson.title}</span>
                      {lesson.status === "completed" ? (
                        <CheckCircle className="h-3 w-3 text-tape-green shrink-0" />
                      ) : !lesson.isUnlocked ? (
                        <Lock className="h-3 w-3 shrink-0" />
                      ) : (
                        <PlayCircle className="h-3 w-3 text-tape-orange shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] opacity-70">{formatDuration(lesson.videoDurationSeconds)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <section className="w-full">
          {activeLesson ? (
            <div className="mx-auto w-full max-w-3xl space-y-6">
              <div className="rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
                <div className="space-y-3 mb-6">
                  <p className="text-xs font-semibold text-tape-orange">LESSON</p>
                  <h2 className="text-2xl font-bold text-tape-brown">{activeLesson.title}</h2>
                </div>

                {activeLessonVideo.type !== "none" ? (
                  <div className="aspect-video w-full overflow-hidden rounded-2xl border border-tape-beige shadow-inner bg-black/5">
                    {activeLessonVideo.type === "youtube" && activeLessonVideo.src ? (
                      <iframe
                        src={activeLessonVideo.src}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={activeLesson.title}
                      />
                    ) : activeLessonVideo.type === "vimeo" && activeLessonVideo.src ? (
                      <iframe
                        src={activeLessonVideo.src}
                        className="h-full w-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title={activeLesson.title}
                      />
                    ) : activeLessonVideo.type === "file" && activeLessonVideo.src ? (
                      <video controls className="h-full w-full" src={activeLessonVideo.src} />
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-tape-beige p-6 text-sm text-tape-light-brown text-center">
                    動画は準備中です。
                  </div>
                )}

                {activeLessonSummaryParagraphs.length > 0 && (
                  <div className="mt-6 rounded-2xl border border-tape-beige bg-tape-cream/40 p-6 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tape-orange">動画の要約</p>
                    {activeLessonSummaryParagraphs.map((paragraph, index) => (
                      <p
                        key={`${activeLesson.id}-summary-${index}`}
                        className="text-sm leading-relaxed text-tape-brown whitespace-pre-line"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}

                {activeLessonKeyPoints.length > 0 && (
                  <div className="mt-6 rounded-2xl border border-tape-beige bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-tape-orange">
                      <span className="h-2 w-2 rounded-full bg-tape-orange" />
                      重点ポイント
                    </div>
                    <div className="space-y-3">
                      {activeLessonKeyPoints.map((point, index) => (
                        <div
                          key={`${activeLesson.id}-kp-${index}`}
                          className="rounded-xl border border-tape-beige/70 bg-tape-cream/30 px-4 py-3 text-sm leading-relaxed text-tape-brown whitespace-pre-line shadow-sm"
                        >
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex gap-2">
                    {prevLesson && (
                      <Button variant="outline" size="sm" onClick={() => setActiveLessonId(prevLesson.id)}>
                        <ChevronLeft className="h-3 w-3 mr-1" /> 前へ
                      </Button>
                    )}
                    {nextLesson && (
                      <Button variant="outline" size="sm" onClick={() => setActiveLessonId(nextLesson.id)}>
                        次へ <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                  <Button
                    onClick={handleCompleteLesson}
                    disabled={!viewerCanInteract || !activeLesson.isUnlocked || pendingAction !== null}
                    className="bg-tape-brown text-white hover:bg-tape-brown/90"
                  >
                    レッスン完了にする
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-tape-brown mb-4">
                    <FileText className="h-4 w-4" /> セルフノート
                  </h3>
                  <textarea
                    value={noteDrafts[activeLesson.id] ?? ""}
                    onChange={(event) =>
                      setNoteDrafts((prev) => ({
                        ...prev,
                        [activeLesson.id]: event.target.value
                      }))
                    }
                    placeholder="気づきや次のアクションをメモ"
                    className="h-40 w-full rounded-2xl border border-tape-beige bg-tape-cream/50 px-4 py-3 text-base md:text-sm focus:border-tape-orange focus:outline-none focus:ring-1 focus:ring-tape-orange resize-none"
                    disabled={!viewerCanInteract || !activeLesson.isUnlocked}
                  />
                  <div className="mt-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={!viewerCanInteract || !activeLesson.isUnlocked || pendingAction !== null}
                    >
                      ノートを保存
                    </Button>
                  </div>
                </div>

                {activeLesson.quiz && (
                  <div className="rounded-3xl border border-tape-orange/20 bg-tape-orange/5 p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-tape-brown mb-4">理解度チェック</h3>
                    <div className="space-y-4 text-sm">
                      {activeLesson.quiz.questions.map((question, index) => (
                        <div key={question.id} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm border border-tape-beige">
                          <p className="font-semibold text-tape-brown text-xs">
                            Q{index + 1}. {question.question}
                          </p>
                          <div className="space-y-1.5">
                            {question.choices.map((choice) => (
                              <label key={choice.id} className="flex cursor-pointer items-center gap-2 text-xs p-1 rounded hover:bg-tape-cream">
                                <input
                                  type="radio"
                                  name={`${activeLesson.id}-${question.id}`}
                                  value={choice.id}
                                  checked={quizDrafts[activeLesson.id]?.[question.id] === choice.id}
                                  onChange={() => handleQuizSelect(activeLesson.id, question.id, choice.id)}
                                  disabled={!viewerCanInteract || !activeLesson.isUnlocked || Boolean(activeLesson.quiz?.attempt?.passed)}
                                  className="accent-tape-orange"
                                />
                                <span className="text-tape-brown/90">{choice.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeLesson.quiz.attempt && (
                      <p className="mt-4 text-xs font-semibold text-tape-brown text-right">
                        スコア: {activeLesson.quiz.attempt.score}% - {activeLesson.quiz.attempt.passed ? "合格 🎉" : "再挑戦"}
                      </p>
                    )}
                    <div className="mt-4 text-right">
                      <Button
                        onClick={handleSubmitQuiz}
                        disabled={!viewerCanInteract || !activeLesson.isUnlocked || pendingAction !== null}
                        className="bg-tape-orange text-white hover:bg-tape-orange/90"
                      >
                        クイズを送信
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Card className="flex items-center justify-center p-10 bg-white/50 border-dashed">
              <p className="text-sm text-tape-light-brown">左のリストからレッスンを選択してください。</p>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
