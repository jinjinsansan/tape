"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  PlayCircle, 
  Clock, 
  BookOpen, 
  CheckCircle, 
  Lock,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CoursePurchaseModal } from "@/components/courses/course-purchase-modal";

type CourseModule = {
  id: string;
  title: string;
  summary: string | null;
  orderIndex: number;
  lessonsCount: number;
};

type CourseDetail = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  currency: string;
  level: string | null;
  tags: string[] | null;
  totalDurationSeconds: number | null;
  heroUrl: string | null;
  modules: CourseModule[];
  isPurchased: boolean;
  totalLessons: number;
};

type ApiResponse = {
  course: CourseDetail;
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  }
  return `${minutes}分`;
};

const formatPrice = (price: number) => {
  if (price === 0) return "無料";
  return `¥${price.toLocaleString()}`;
};

const getLevelLabel = (level: string | null) => {
  switch (level) {
    case "beginner":
      return "初心者向け";
    case "intermediate":
      return "中級者向け";
    case "advanced":
      return "上級者向け";
    default:
      return "";
  }
};

export function CourseDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await fetch(`/api/courses/${slug}/detail`, { cache: "no-store" });
        if (res.status === 404) {
          setError("コースが見つかりません");
          return;
        }
        if (!res.ok) {
          throw new Error("コース情報の取得に失敗しました");
        }
        const data = (await res.json()) as ApiResponse;
        setCourse(data.course);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [slug]);

  const handleStart = async () => {
    if (!course) return;

    // 無料コースまたは購入済みの場合は直接学習ページへ
    if (course.price === 0 || course.isPurchased) {
      setStarting(true);
      router.push(`/courses/${slug}/learn`);
      return;
    }

    // 有料コース＆未購入の場合は決済モーダル表示
    setShowPurchaseModal(true);
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseModal(false);
    // 購入完了後、学習ページへ
    router.push(`/courses/${slug}/learn`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tape-cream via-white to-tape-beige/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-tape-orange border-r-transparent"></div>
          <p className="mt-4 text-sm text-tape-light-brown">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tape-cream via-white to-tape-beige/30 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-tape-pink">{error || "コースが見つかりません"}</p>
          <Button onClick={() => router.push("/courses")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            コース一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-tape-cream via-white to-tape-beige/30">
        {/* Hero Section */}
        <section className="border-b border-tape-beige bg-gradient-to-br from-white to-tape-cream/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
            <div className="mx-auto max-w-4xl">
              {/* Back Button */}
              <Button
                onClick={() => router.push("/courses")}
                variant="ghost"
                className="mb-6 text-tape-light-brown hover:text-tape-brown"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                コース一覧に戻る
              </Button>

              <div className="space-y-6">
                {/* Tags & Level */}
                <div className="flex flex-wrap gap-2">
                  {course.price === 0 ? (
                    <span className="inline-flex items-center rounded-full bg-tape-green px-4 py-1.5 text-sm font-bold text-white shadow-md">
                      無料コース
                    </span>
                  ) : course.isPurchased ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-tape-orange px-4 py-1.5 text-sm font-bold text-white shadow-md">
                      <CheckCircle className="h-4 w-4" />
                      購入済み
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-tape-brown px-4 py-1.5 text-sm font-bold text-white shadow-md">
                      {formatPrice(course.price)}
                    </span>
                  )}
                  {course.level && (
                    <span className="rounded-full bg-tape-beige px-4 py-1.5 text-sm font-medium text-tape-brown">
                      {getLevelLabel(course.level)}
                    </span>
                  )}
                  {course.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white border border-tape-beige px-4 py-1.5 text-sm font-medium text-tape-light-brown"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-tape-brown">
                  {course.title}
                </h1>

                {/* Subtitle */}
                {course.subtitle && (
                  <p className="text-lg sm:text-xl text-tape-light-brown">
                    {course.subtitle}
                  </p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap gap-6 text-sm text-tape-brown">
                  {course.totalLessons > 0 && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-tape-orange" />
                      <span>{course.totalLessons}レッスン</span>
                    </div>
                  )}
                  {course.totalDurationSeconds && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-tape-orange" />
                      <span>{formatDuration(course.totalDurationSeconds)}</span>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  onClick={handleStart}
                  disabled={starting}
                  size="lg"
                  className={cn(
                    "text-base sm:text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all",
                    course.price === 0
                      ? "bg-tape-green hover:bg-tape-green/90"
                      : course.isPurchased
                      ? "bg-tape-orange hover:bg-tape-orange/90"
                      : "bg-gradient-to-r from-tape-orange to-tape-pink hover:from-tape-orange/90 hover:to-tape-pink/90"
                  )}
                >
                  {starting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      読み込み中...
                    </>
                  ) : course.price === 0 || course.isPurchased ? (
                    <>
                      <PlayCircle className="mr-2 h-5 w-5" />
                      コースを始める
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-5 w-5" />
                      購入してコースを始める
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Description Section */}
        {course.description && (
          <section className="border-b border-tape-beige bg-white/40">
            <div className="container mx-auto px-4 py-8 sm:py-12">
              <div className="mx-auto max-w-4xl">
                <h2 className="text-2xl font-bold text-tape-brown mb-4">コース概要</h2>
                <p className="text-base sm:text-lg text-tape-brown/80 whitespace-pre-wrap leading-relaxed">
                  {course.description}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Curriculum Section */}
        {course.modules.length > 0 && (
          <section className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-tape-brown mb-6 sm:mb-8">
                カリキュラム
              </h2>
              <div className="space-y-4">
                {course.modules.map((module, index) => (
                  <Card key={module.id} className="border-2 border-tape-beige hover:border-tape-orange transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-tape-orange to-tape-pink text-white font-bold shadow-md">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <h3 className="text-lg sm:text-xl font-bold text-tape-brown">
                            {module.title}
                          </h3>
                          {module.summary && (
                            <p className="text-sm text-tape-light-brown">
                              {module.summary}
                            </p>
                          )}
                          <p className="text-xs text-tape-brown/60">
                            {module.lessonsCount}レッスン
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Empty Curriculum Message */}
        {course.modules.length === 0 && (
          <section className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
            <div className="mx-auto max-w-4xl text-center py-12">
              <BookOpen className="mx-auto h-16 w-16 text-tape-light-brown/50 mb-4" />
              <p className="text-tape-light-brown">カリキュラムは準備中です。</p>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="sticky bottom-0 border-t border-tape-beige bg-white/80 backdrop-blur-md shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
              <div className="hidden sm:block">
                <p className="text-sm text-tape-light-brown">今すぐ始めましょう</p>
                <p className="text-lg font-bold text-tape-brown">{course.title}</p>
              </div>
              <Button
                onClick={handleStart}
                disabled={starting}
                size="lg"
                className={cn(
                  "w-full sm:w-auto shadow-lg",
                  course.price === 0
                    ? "bg-tape-green hover:bg-tape-green/90"
                    : course.isPurchased
                    ? "bg-tape-orange hover:bg-tape-orange/90"
                    : "bg-gradient-to-r from-tape-orange to-tape-pink hover:from-tape-orange/90 hover:to-tape-pink/90"
                )}
              >
                {starting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    読み込み中...
                  </>
                ) : course.price === 0 || course.isPurchased ? (
                  <>
                    <PlayCircle className="mr-2 h-5 w-5" />
                    コースを始める
                  </>
                ) : (
                  <>
                    {formatPrice(course.price)} で購入
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && course && (
        <CoursePurchaseModal
          courseId={course.id}
          courseTitle={course.title}
          price={course.price}
          currency={course.currency}
          onSuccess={handlePurchaseSuccess}
          onClose={() => setShowPurchaseModal(false)}
        />
      )}
    </>
  );
}
