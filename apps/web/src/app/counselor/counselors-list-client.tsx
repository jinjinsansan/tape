"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "lucide-react"; // Wait, Badge is not in lucide. I'll use standard div or check lucide. 
// Lucide doesn't have Badge component (it has BadgeIcon). I'll just use span.

type Counselor = {
  slug: string;
  display_name: string;
  specialties: string[] | null;
  avatar_url: string | null;
  hourly_rate_cents: number;
  available_slots_count?: number;
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
    return <p className="text-sm text-tape-light-brown">読み込み中...</p>;
  }

  if (error) {
    return <p className="text-sm text-tape-pink">{error}</p>;
  }

  if (counselors.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-tape-beige bg-white/50 p-12 text-center">
        <p className="text-sm font-bold text-tape-brown">現在、予約可能なカウンセラーがいません</p>
        <p className="mt-2 text-xs text-tape-light-brown">
          恐れ入りますが、しばらく経ってから再度ご確認ください。<br />
          新しいスケジュールは随時追加されます。
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {counselors.map((counselor) => (
        <Card key={counselor.slug} className="h-full border-tape-beige shadow-sm transition-all hover:shadow-md">
          <CardContent className="flex flex-col gap-4 p-5 h-full">
            <div className="flex items-start gap-4">
              <img
                src={counselor.avatar_url ?? "https://placehold.co/128x128/F5F2EA/5C554F?text=User"}
                alt={counselor.display_name}
                className="h-20 w-20 rounded-full object-cover border border-tape-beige flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-tape-brown truncate">{counselor.display_name}</p>
                  {(counselor.available_slots_count ?? 0) > 0 ? (
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                      予約受付中
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                      空き枠なし
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {counselor.specialties?.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] bg-tape-beige/30 text-tape-brown px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-tape-light-brown font-medium">初回 {yen(counselor.hourly_rate_cents)} / 60分</p>
              </div>
            </div>
            
            <div className="mt-auto pt-2">
              <Link href={`/counselor/${counselor.slug}`} className="block">
                <button className="w-full rounded-full bg-tape-brown py-3 text-sm font-bold text-white transition-colors hover:bg-tape-brown/90 shadow-sm">
                  予約・詳細を見る
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
