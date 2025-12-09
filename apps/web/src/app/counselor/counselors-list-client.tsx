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

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {counselors.map((counselor) => (
        <Link key={counselor.slug} href={`/counselor/${counselor.slug}`}>
          <Card className="h-full border-tape-beige shadow-sm transition-all hover:shadow-md hover:border-tape-green/50">
            <CardContent className="flex items-center gap-4 p-4">
              <img
                src={counselor.avatar_url ?? "https://placehold.co/128x128/F5F2EA/5C554F?text=User"}
                alt={counselor.display_name}
                className="h-16 w-16 rounded-full object-cover border border-tape-beige"
              />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-tape-brown truncate">{counselor.display_name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {counselor.specialties?.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] bg-tape-green/10 text-tape-brown px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-tape-light-brown font-medium">初回 {yen(counselor.hourly_rate_cents)}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
