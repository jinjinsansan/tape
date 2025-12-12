"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, Loader2, Sparkles } from "lucide-react";

type Assessment = {
  id: string;
  age_path: string;
  self_esteem_score: number;
  worthlessness_score: number;
  measured_at: string;
};

type InitialScore = {
  self_esteem_score: number;
  worthlessness_score: number;
  measured_on: string;
};

type ApiResponse = {
  assessments: Assessment[];
  latest: Assessment | null;
  initialScore: InitialScore | null;
};

const formatDate = (input: string) => {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

export default function FirstStepsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [initialScore, setInitialScore] = useState<InitialScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/diary/self-assessments?limit=5", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("診断履歴の取得に失敗しました");
        }
        const data: ApiResponse = await res.json();
        setAssessments(data.assessments ?? []);
        setInitialScore(data.initialScore ?? null);
      } catch (err) {
        console.error(err);
        setError("診断履歴の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const latest = assessments[0] ?? null;
  const firstRecord = useMemo(() => {
    if (!assessments.length) return null;
    return assessments[assessments.length - 1];
  }, [assessments]);

  return (
    <div className="min-h-screen bg-tape-cream px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href="/diary" className="text-sm text-tape-light-brown hover:text-tape-brown">
          ← かんじょうにっきトップへ戻る
        </Link>

        <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-tape-beige/60 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-tape-pink tracking-[0.3em]">FIRST STEP</p>
              <h1 className="text-3xl font-bold text-tape-brown">最初にやること</h1>
              <p className="mt-2 text-sm text-tape-light-brown">
                自己肯定感と無価値感の現在地を測り、グラフの起点をつくります。診断ボタンからいつでも再計測できます。
              </p>
            </div>
            <Link
              href="/diary/first-steps/assessment"
              className="inline-flex items-center rounded-full bg-tape-brown px-6 py-3 text-sm font-semibold text-white hover:bg-tape-brown/90"
            >
              診断する
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-tape-beige bg-tape-cream/60 p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-tape-brown" />
                <p className="text-sm font-semibold text-tape-brown">最新の診断結果</p>
              </div>
              {loading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-tape-light-brown">
                  <Loader2 className="h-4 w-4 animate-spin" /> 読み込み中...
                </div>
              ) : latest ? (
                <div className="mt-4 space-y-2 text-sm text-tape-brown">
                  <p className="text-xs text-tape-light-brown">{formatDate(latest.measured_at)}</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold">自己肯定感 {latest.self_esteem_score}</span>
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold">無価値感 {latest.worthlessness_score}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-tape-light-brown">まだ診断を行っていません。</p>
              )}
            </div>

            <div className="rounded-2xl border border-tape-beige bg-white/70 p-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-tape-brown" />
                <p className="text-sm font-semibold text-tape-brown">一番最初の診断</p>
              </div>
              {firstRecord ? (
                <div className="mt-4 space-y-2 text-sm text-tape-brown">
                  <p className="text-xs text-tape-light-brown">{formatDate(firstRecord.measured_at)}</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-tape-cream px-4 py-2 text-sm font-semibold">自己肯定感 {firstRecord.self_esteem_score}</span>
                    <span className="rounded-full bg-tape-cream px-4 py-2 text-sm font-semibold">無価値感 {firstRecord.worthlessness_score}</span>
                  </div>
                </div>
              ) : initialScore ? (
                <div className="mt-4 space-y-2 text-sm text-tape-brown">
                  <p className="text-xs text-tape-light-brown">{formatDate(initialScore.measured_on)}</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-tape-cream px-4 py-2 text-sm font-semibold">自己肯定感 {initialScore.self_esteem_score}</span>
                    <span className="rounded-full bg-tape-cream px-4 py-2 text-sm font-semibold">無価値感 {initialScore.worthlessness_score}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-tape-light-brown">診断を行うと、ここに初回記録が表示されます。</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-tape-beige bg-white/80 p-4 text-sm text-tape-brown">
            <div className="flex items-center gap-2 text-tape-light-brown">
              <Sparkles className="h-4 w-4" />
              <span>診断結果は無価値感の推移グラフの起点になり、次に「無価値感」で日記を書いた日の前日のスコアとして使用されます。</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-tape-beige/60">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-tape-brown">診断履歴</h2>
              <p className="text-sm text-tape-light-brown">直近5件まで表示しています。</p>
            </div>
            <Link
              href="/diary/first-steps/assessment"
              className="text-sm font-semibold text-tape-brown underline decoration-tape-brown/40"
            >
              診断する
            </Link>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-tape-light-brown">
              <Loader2 className="h-4 w-4 animate-spin" />
              読み込み中...
            </div>
          ) : error ? (
            <p className="mt-6 text-sm text-tape-pink">{error}</p>
          ) : assessments.length === 0 ? (
            <p className="mt-6 text-sm text-tape-light-brown">まだ記録がありません。診断を行って初期スコアを作成しましょう。</p>
          ) : (
            <div className="mt-6 space-y-3">
              {assessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex flex-wrap items-center justify-between rounded-2xl border border-tape-beige bg-tape-cream/60 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-tape-brown">{formatDate(assessment.measured_at)}</p>
                    <p className="text-xs text-tape-light-brown">ルート: {assessment.age_path === "teen" ? "10代向け" : assessment.age_path === "adult" ? "20〜50代向け" : "60代以上向け"}</p>
                  </div>
                  <div className="flex gap-3 text-tape-brown">
                    <span className="rounded-full bg-white px-3 py-1 font-semibold">自己肯定感 {assessment.self_esteem_score}</span>
                    <span className="rounded-full bg-white px-3 py-1 font-semibold">無価値感 {assessment.worthlessness_score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
