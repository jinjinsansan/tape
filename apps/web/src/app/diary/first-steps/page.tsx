"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Save, RefreshCw } from "lucide-react";

type InitialScore = {
  self_esteem_score: number;
  worthlessness_score: number;
  measured_on: string;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function FirstStepsPage() {
  const [selfScore, setSelfScore] = useState(50);
  const [worthScore, setWorthScore] = useState(50);
  const [measuredOn, setMeasuredOn] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/diary/initial-score", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.initialScore) {
          const record: InitialScore = data.initialScore;
          setSelfScore(record.self_esteem_score);
          setWorthScore(record.worthlessness_score);
          setMeasuredOn(record.measured_on);
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const handleSelfChange = (value: number) => {
    const clamped = Math.min(Math.max(value, 0), 100);
    setSelfScore(clamped);
    setWorthScore(100 - clamped);
  };

  const handleWorthChange = (value: number) => {
    const clamped = Math.min(Math.max(value, 0), 100);
    setWorthScore(clamped);
    setSelfScore(100 - clamped);
  };

  const handleSubmit = async () => {
    if (selfScore + worthScore !== 100) {
      setError("自己肯定感と無価値感の合計は100にしてください");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/diary/initial-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selfEsteemScore: selfScore,
          worthlessnessScore: worthScore,
          measuredOn
        })
      });
      if (!res.ok) {
        throw new Error("failed");
      }
      setMessage("初期スコアを保存しました");
    } catch (err) {
      console.error(err);
      setError("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-tape-cream px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href="/diary" className="text-sm text-tape-light-brown hover:text-tape-brown">
          ← かんじょうにっきトップへ戻る
        </Link>
        <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-tape-beige/50 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-tape-brown">最初にやること</h1>
            <p className="mt-2 text-sm text-tape-light-brown">
              現在の自己肯定感と無価値感を数値化し、推移グラフの起点を作ります。2つのスコアは必ず 100 になるように設定します。
            </p>
          </div>

          <div className="rounded-2xl border border-tape-beige bg-tape-cream/50 p-4">
            <label className="flex flex-col gap-2 text-sm font-semibold text-tape-light-brown">
              計測日
              <input
                type="date"
                value={measuredOn}
                max={todayIso()}
                onChange={(event) => setMeasuredOn(event.target.value)}
                className="rounded-2xl border border-tape-beige px-4 py-2 text-sm text-tape-brown focus:border-tape-pink focus:outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-tape-beige bg-white/70 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-tape-light-brown">
                <span>自己肯定感</span>
                <span className="text-tape-brown">{selfScore}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={selfScore}
                onChange={(event) => handleSelfChange(Number(event.target.value))}
                className="accent-tape-green mt-4 w-full"
              />
            </div>
            <div className="rounded-2xl border border-tape-beige bg-white/70 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-tape-light-brown">
                <span>無価値感</span>
                <span className="text-tape-brown">{worthScore}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={worthScore}
                onChange={(event) => handleWorthChange(Number(event.target.value))}
                className="accent-tape-pink mt-4 w-full"
              />
            </div>
          </div>

          {error && <p className="text-sm text-tape-pink">{error}</p>}
          {message && <p className="text-sm text-tape-green">{message}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-tape-brown px-4 py-2 text-sm font-semibold text-white hover:bg-tape-brown/90 disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {loading ? "保存中..." : "初期スコアを保存"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelfScore(50);
                setWorthScore(50);
                setMeasuredOn(todayIso());
              }}
              className="inline-flex items-center gap-2 rounded-full border border-tape-beige px-4 py-2 text-sm font-semibold text-tape-brown hover:bg-white"
            >
              <RefreshCw className="h-4 w-4" /> リセット
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
