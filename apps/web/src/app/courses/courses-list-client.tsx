"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, Lock, CheckCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Course = {
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
  isPurchased: boolean;
};

type ApiResponse = {
  courses: Course[];
};

const formatPrice = (price: number, currency: string) => {
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

export function CoursesListClient() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch("/api/courses", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("コース一覧の取得に失敗しました");
        }
        const data = (await res.json()) as ApiResponse;
        setCourses(data.courses);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tape-cream via-white to-tape-beige/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-tape-pink">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tape-cream via-white to-tape-beige/30">
      {/* Hero Section */}
      <section className="border-b border-tape-beige bg-white/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-tape-brown mb-4 sm:mb-6">
              動画コース
            </h1>
            <p className="text-base sm:text-lg text-tape-light-brown">
              心理学を体系的に学べる動画コースで、あなたの成長をサポートします。
              <br className="hidden sm:block" />
              無料コースから本格的なプロ養成講座まで、目的に合わせて選べます。
            </p>
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
          {courses.map((course) => (
            <Card
              key={course.id}
              className={cn(
                "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl",
                course.price === 0
                  ? "border-2 border-tape-beige bg-white hover:border-tape-orange"
                  : "border-2 border-tape-beige bg-white hover:border-tape-orange"
              )}
            >
              <CardContent className="p-6 sm:p-8">
                {/* Price Badge */}
                <div className="absolute top-4 right-4">
                  {course.price === 0 ? (
                    <span className="inline-flex items-center rounded-full bg-tape-brown px-3 py-1 text-xs font-bold text-white shadow-md">
                      無料
                    </span>
                  ) : course.isPurchased ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-tape-orange px-3 py-1 text-xs font-bold text-white shadow-md">
                      <CheckCircle className="h-3 w-3" />
                      購入済み
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-tape-brown px-3 py-1 text-xs font-bold text-white shadow-md">
                      {formatPrice(course.price, course.currency)}
                    </span>
                  )}
                </div>

                {/* Course Icon */}
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-tape-orange to-tape-pink text-white shadow-lg">
                  <PlayCircle className="h-8 w-8" />
                </div>

                {/* Course Title */}
                <h3 className="mb-2 text-xl sm:text-2xl font-bold text-tape-brown line-clamp-2">
                  {course.title}
                </h3>

                {/* Subtitle */}
                {course.subtitle && (
                  <p className="mb-4 text-sm text-tape-light-brown line-clamp-1">
                    {course.subtitle}
                  </p>
                )}

                {/* Tags & Level */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {course.level && (
                    <span className="rounded-full bg-tape-beige px-3 py-1 text-xs font-medium text-tape-brown">
                      {getLevelLabel(course.level)}
                    </span>
                  )}
                  {course.tags?.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-tape-cream px-3 py-1 text-xs font-medium text-tape-light-brown"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Description */}
                {course.description && (
                  <p className="mb-6 text-sm text-tape-brown/80 line-clamp-3">
                    {course.description}
                  </p>
                )}

                {/* CTA Button */}
                <Link href={`/courses/${course.slug}`}>
                  <Button
                    className="w-full group-hover:shadow-lg transition-all bg-gradient-to-r from-tape-orange to-tape-pink hover:from-tape-orange/90 hover:to-tape-pink/90"
                  >
                    詳細を見る
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {courses.length === 0 && (
          <div className="text-center py-12">
            <PlayCircle className="mx-auto h-16 w-16 text-tape-light-brown/50 mb-4" />
            <p className="text-tape-light-brown">現在、公開されているコースはありません。</p>
          </div>
        )}
      </section>
    </div>
  );
}
