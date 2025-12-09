"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { Button } from "@/components/ui/button";

type TrendRange = "week" | "month" | "all";

type TrendPoint = {
  date: string;
  selfEsteemScore: number;
  worthlessnessScore: number;
};

type TrendResponse = {
  chart: TrendPoint[];
  emotions: {
    all: Record<string, number>;
    filtered: Record<string, number>;
  };
  initialScore: {
    self_esteem_score: number;
    worthlessness_score: number;
    measured_on: string;
  } | null;
};

const rangeLabels: Record<TrendRange, string> = {
  week: "直近7日",
  month: "直近30日",
  all: "すべて"
};

export default function WorthlessnessPage() {
  const [range, setRange] = useState<TrendRange>("week");
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadTrend = async (selectedRange: TrendRange) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/diary/worthlessness?range=${selectedRange}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load trend");
      }
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrend(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const emotionRanking = data ? Object.entries(data.emotions.filtered).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="min-h-screen bg-tape-cream px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link href="/diary" className="text-sm text-tape-light-brown hover:text-tape-brown">
          ← かんじょうにっきトップへ戻る
        </Link>
        <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-tape-beige/50 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-tape-brown">無価値感の推移</h1>
              <p className="text-sm text-tape-light-brown">
                自己肯定感と無価値感のバランスをグラフで確認し、感情の偏りを把握しましょう。
              </p>
            </div>
            <div className="inline-flex rounded-full bg-tape-beige p-1">
              {Object.entries(rangeLabels).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRange(key as TrendRange)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    range === key ? "bg-white shadow text-tape-brown" : "text-tape-light-brown"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-80 w-full rounded-3xl border border-tape-beige bg-tape-cream/40 p-4">
            {data && data.chart.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={data.chart} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0eae1" />
                  <XAxis dataKey="date" stroke="#b08c72" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#b08c72" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#f0eae1" }} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="selfEsteemScore"
                    name="自己肯定感"
                    stroke="#5ba88f"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="worthlessnessScore"
                    name="無価値感"
                    stroke="#ec8ea3"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-tape-light-brown">
                {loading ? "読み込み中..." : "十分なデータがまだありません"}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-tape-beige bg-tape-cream/40 p-4">
            <p className="text-sm font-semibold text-tape-light-brown">感情の出現ランキング（選択期間）</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {emotionRanking.length === 0 && <p className="text-sm text-tape-light-brown">データがありません。</p>}
              {emotionRanking.map(([emotion, count]) => (
                <div key={emotion} className="rounded-2xl bg-white px-4 py-3 text-sm text-tape-brown shadow-sm">
                  <span className="font-semibold">{emotion}</span>
                  <span className="ml-2 text-tape-light-brown">{count} 回</span>
                </div>
              ))}
            </div>
          </div>

          {data?.initialScore && (
            <div className="rounded-2xl border border-dashed border-tape-beige bg-white/70 px-4 py-3 text-sm text-tape-light-brown">
              初期計測: 自己肯定感 {data.initialScore.self_esteem_score} / 無価値感 {" "}
              {data.initialScore.worthlessness_score} ({data.initialScore.measured_on})
            </div>
          )}

          <Button onClick={() => loadTrend(range)} disabled={loading} variant="outline" className="w-full border-tape-brown text-tape-brown">
            再読み込み
          </Button>
        </div>
      </div>
    </div>
  );
}
