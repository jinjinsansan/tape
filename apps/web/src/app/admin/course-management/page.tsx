"use client";

import { useState, useEffect, useCallback } from "react";

type Course = {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  currency?: string | null;
};

type Module = {
  id: string;
  title: string;
  summary: string | null;
  order_index: number;
  lessons?: any;
};

type Lesson = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  video_url: string | null;
  video_duration_seconds: number | null;
  resources: { keyPoints?: string[] } | null;
  order_index: number;
};

const formatCoursePrice = (course: Course) => {
  const price = course.price ?? 0;
  if (price <= 0) return "無料";
  const prefix = !course.currency || course.currency === "JPY" ? "¥" : `${course.currency} `;
  return `${prefix}${price.toLocaleString()}`;
};

export function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  
  const [moduleForm, setModuleForm] = useState({
    title: "",
    summary: "",
  });
  
  const [lessonForm, setLessonForm] = useState({
    title: "",
    summary: "",
    video_url: "",
    video_duration_seconds: 600,
    key_points: [""],
  });

  const fetchJson = useCallback(async <T,>(url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.error ?? "リクエストに失敗しました");
    }
    return (await res.json()) as T;
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      const data = await fetchJson<{ courses: Course[] }>("/api/admin/courses");
      setCourses(data.courses || []);
    } catch (err) {
      console.error(err);
      alert("コースの取得に失敗しました");
    }
  }, [fetchJson]);

  const loadModules = useCallback(async () => {
    if (!selectedCourse) return;
    try {
      const data = await fetchJson<{ modules: Module[] }>(
        `/api/admin/courses/${selectedCourse.id}/modules`
      );
      setModules(data.modules || []);
    } catch (err) {
      console.error(err);
      alert("モジュールの取得に失敗しました");
    }
  }, [selectedCourse, fetchJson]);

  const loadLessons = useCallback(async () => {
    if (!selectedCourse || !selectedModule) return;
    try {
      const data = await fetchJson<{ lessons: Lesson[] }>(
        `/api/admin/courses/${selectedCourse.id}/modules/${selectedModule.id}/lessons`
      );
      setLessons(data.lessons || []);
    } catch (err) {
      console.error(err);
      alert("レッスンの取得に失敗しました");
    }
  }, [selectedCourse, selectedModule, fetchJson]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (selectedCourse) {
      loadModules();
    }
  }, [selectedCourse, loadModules]);

  useEffect(() => {
    if (selectedModule) {
      loadLessons();
    }
  }, [selectedModule, loadLessons]);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    try {
      await fetchJson(`/api/admin/courses/${selectedCourse.id}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...moduleForm,
          order_index: modules.length + 1,
        }),
      });

      setModuleForm({ title: "", summary: "" });
      setShowModuleForm(false);
      loadModules();
      alert("モジュールを作成しました");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "モジュールの作成に失敗しました");
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!selectedCourse) return;
    if (!confirm("このモジュールを削除しますか？この操作は元に戻せません。")) return;
    try {
      await fetchJson(
        `/api/admin/courses/${selectedCourse.id}/modules/${moduleId}`,
        { method: "DELETE" }
      );
      if (selectedModule?.id === moduleId) {
        setSelectedModule(null);
        setLessons([]);
      }
      alert("モジュールを削除しました");
      loadModules();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "モジュールの削除に失敗しました");
    }
  };

  const handleCreateOrUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !selectedModule) return;

    const filteredKeyPoints = lessonForm.key_points.filter((kp) => kp.trim() !== "");

    try {
      if (editingLesson) {
        // Update
        await fetchJson(
          `/api/admin/courses/${selectedCourse.id}/modules/${selectedModule.id}/lessons/${editingLesson.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...lessonForm,
              key_points: filteredKeyPoints,
            }),
          }
        );
        alert("レッスンを更新しました");
      } else {
        // Create
        await fetchJson(
          `/api/admin/courses/${selectedCourse.id}/modules/${selectedModule.id}/lessons`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...lessonForm,
              key_points: filteredKeyPoints,
              slug: `lesson-${Date.now()}`,
              order_index: lessons.length + 1,
            }),
          }
        );
        alert("レッスンを作成しました");
      }

      setLessonForm({
        title: "",
        summary: "",
        video_url: "",
        video_duration_seconds: 600,
        key_points: [""],
      });
      setEditingLesson(null);
      setShowLessonForm(false);
      loadLessons();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "レッスンの保存に失敗しました");
    }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      summary: lesson.summary || "",
      video_url: lesson.video_url || "",
      video_duration_seconds: lesson.video_duration_seconds || 600,
      key_points: lesson.resources?.keyPoints || [""],
    });
    setShowLessonForm(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("このレッスンを削除しますか？")) return;
    if (!selectedCourse || !selectedModule) return;

    try {
      await fetchJson(
        `/api/admin/courses/${selectedCourse.id}/modules/${selectedModule.id}/lessons/${lessonId}`,
        { method: "DELETE" }
      );
      alert("レッスンを削除しました");
      loadLessons();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "レッスンの削除に失敗しました");
    }
  };

  const addKeyPoint = () => {
    setLessonForm({
      ...lessonForm,
      key_points: [...lessonForm.key_points, ""],
    });
  };

  const removeKeyPoint = (index: number) => {
    setLessonForm({
      ...lessonForm,
      key_points: lessonForm.key_points.filter((_, i) => i !== index),
    });
  };

  const updateKeyPoint = (index: number, value: string) => {
    const updated = [...lessonForm.key_points];
    updated[index] = value;
    setLessonForm({ ...lessonForm, key_points: updated });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-slate-900">コース管理</h2>

      {/* Course Selection */}
      <div className="rounded-2xl border border-slate-100 bg-white/90 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">コース選択</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => {
                setSelectedCourse(course);
                setSelectedModule(null);
                setLessons([]);
              }}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                selectedCourse?.id === course.id
                  ? "border-purple-500 bg-purple-50"
                  : "border-slate-200 hover:border-purple-300"
              }`}
            >
                <p className="font-bold text-slate-900">{course.title}</p>
                <p className="text-sm text-slate-600 mt-1">{formatCoursePrice(course)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Modules Section */}
      {selectedCourse && (
        <div className="rounded-2xl border border-slate-100 bg-white/90 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              モジュール ({selectedCourse.title})
            </h3>
            <button
              onClick={() => setShowModuleForm(!showModuleForm)}
              className="rounded-full bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600"
            >
              {showModuleForm ? "キャンセル" : "+ モジュール追加"}
            </button>
          </div>

          {showModuleForm && (
            <form onSubmit={handleCreateModule} className="mb-6 space-y-4 rounded-xl bg-purple-50 p-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  モジュール名
                </label>
                <input
                  type="text"
                  value={moduleForm.title}
                  onChange={(e) =>
                    setModuleForm({ ...moduleForm, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-base md:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  説明（任意）
                </label>
                <textarea
                  value={moduleForm.summary}
                  onChange={(e) =>
                    setModuleForm({ ...moduleForm, summary: e.target.value })
                  }
                  className="w-full h-20 rounded-lg border border-slate-300 p-2 text-base md:text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded-full bg-purple-600 px-6 py-2 text-sm text-white hover:bg-purple-700"
              >
                作成
              </button>
            </form>
          )}

          <div className="space-y-2">
            {modules.map((module) => (
              <div
                key={module.id}
                onClick={() => setSelectedModule(module)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setSelectedModule(module);
                  }
                }}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                  selectedModule?.id === module.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <p className="font-bold text-slate-900">{module.title}</p>
                {module.summary && (
                  <p className="text-sm text-slate-600 mt-1">{module.summary}</p>
                )}
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    レッスン数: {
                      (Array.isArray(module.lessons) && module.lessons[0]?.count) ||
                      module.lessons?.count ||
                      0
                    }
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteModule(module.id);
                    }}
                    className="text-rose-600 hover:underline"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
            {modules.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">モジュールがまだありません。</p>
            )}
          </div>
        </div>
      )}

      {/* Lessons Section */}
      {selectedModule && (
        <div className="rounded-2xl border border-slate-100 bg-white/90 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              レッスン ({selectedModule.title})
            </h3>
            <button
              onClick={() => {
                setEditingLesson(null);
                setLessonForm({
                  title: "",
                  summary: "",
                  video_url: "",
                  video_duration_seconds: 600,
                  key_points: [""],
                });
                setShowLessonForm(!showLessonForm);
              }}
              className="rounded-full bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
            >
              {showLessonForm ? "キャンセル" : "+ レッスン追加"}
            </button>
          </div>

          {showLessonForm && (
            <form
              onSubmit={handleCreateOrUpdateLesson}
              className="mb-6 space-y-4 rounded-xl bg-blue-50 p-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  レッスン名
                </label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-base md:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  YouTube動画URL（埋め込み形式）
                </label>
                <input
                  type="text"
                  value={lessonForm.video_url}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, video_url: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-base md:text-sm"
                  placeholder="https://www.youtube.com/embed/VIDEO_ID"
                />
                <p className="text-xs text-slate-500 mt-1">
                  例: https://www.youtube.com/embed/eFRN-AR09Mo
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  動画時間（秒）
                </label>
                <input
                  type="number"
                  value={lessonForm.video_duration_seconds}
                  onChange={(e) =>
                    setLessonForm({
                      ...lessonForm,
                      video_duration_seconds: parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-base md:text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  例: 600（10分）、1200（20分）
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  要約
                </label>
                <textarea
                  value={lessonForm.summary}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, summary: e.target.value })
                  }
                  className="w-full h-32 rounded-lg border border-slate-300 p-2 text-base md:text-sm"
                  placeholder="レッスンの要約を入力..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  重点ポイント
                </label>
                <div className="space-y-2">
                  {lessonForm.key_points.map((kp, index) => (
                    <div key={index} className="flex gap-2">
                      <textarea
                        value={kp}
                        onChange={(e) => updateKeyPoint(index, e.target.value)}
                        className="flex-1 h-20 rounded-lg border border-slate-300 p-2 text-base md:text-sm"
                        placeholder={`重点ポイント ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeKeyPoint(index)}
                        className="px-3 text-red-600 hover:text-red-800"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addKeyPoint}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + 重点ポイント追加
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700"
                >
                  {editingLesson ? "更新" : "作成"}
                </button>
                {editingLesson && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLesson(null);
                      setShowLessonForm(false);
                      setLessonForm({
                        title: "",
                        summary: "",
                        video_url: "",
                        video_duration_seconds: 600,
                        key_points: [""],
                      });
                    }}
                    className="rounded-full border border-slate-300 px-6 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    キャンセル
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="space-y-3">
            {lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className="rounded-xl border border-slate-200 p-4 hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">
                      {index + 1}. {lesson.title}
                    </p>
                    {lesson.summary && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {lesson.summary}
                      </p>
                    )}
                    {lesson.video_url && (
                      <p className="text-xs text-blue-600 mt-1">
                        🎥 {lesson.video_url}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {lesson.video_duration_seconds
                        ? `${Math.floor(lesson.video_duration_seconds / 60)}分`
                        : "時間未設定"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditLesson(lesson)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
