"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Counselor = {
  slug: string;
  display_name: string;
  specialties: string[] | null;
  avatar_url: string | null;
  hourly_rate_cents: number;
};

const yen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;

export function CounselorsListClient() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/counselors");
        if (!res.ok) throw new Error("ロードに失敗しました");
        const data = await res.json();
        setCounselors(data.counselors ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "ロードに失敗しました");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">読み込み中...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-500">{error}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {counselors.map((counselor) => (
        <Link
          key={counselor.slug}
          href={`/counselor/${counselor.slug}`}
          className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 shadow-sm"
        >
          <img src={counselor.avatar_url ?? "https://placehold.co/64x64"} alt={counselor.display_name} className="h-14 w-14 rounded-2xl object-cover" />
          <div>
            <p className="text-base font-semibold text-slate-800">{counselor.display_name}</p>
            <p className="text-xs text-slate-500">{counselor.specialties?.join(" / ")}</p>
            <p className="text-xs text-slate-400">初回 {yen(counselor.hourly_rate_cents)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
