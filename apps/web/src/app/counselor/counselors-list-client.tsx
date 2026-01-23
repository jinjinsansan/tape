"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { COUNSELOR_PLAN_CONFIGS, normalizePlanSelection } from "@/constants/counselor-plans";

type Counselor = {
  slug: string;
  display_name: string;
  specialties: string[] | null;
  avatar_url: string | null;
  hourly_rate_cents: number;
  profile_metadata: Record<string, unknown> | null;
  accepting_bookings: boolean;
};

export function CounselorsListClient() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/counselors", { cache: "no-store" });
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
    return <p className="text-sm text-[#a4938a]">読み込み中...</p>;
  }

  if (error) {
    return <p className="text-sm text-[#d59da9]">{error}</p>;
  }

  if (counselors.length === 0) {
    return (
      <div className="rounded-[32px] border border-dashed border-[#f0e4d8] bg-white/80 p-12 text-center shadow-sm">
        <p className="text-sm font-bold text-[#51433c]">現在、受付中のカウンセラーがいません</p>
        <p className="mt-2 text-xs text-[#8b7a71]">
          恐れ入りますが、しばらく経ってから再度ご確認ください。<br />
          SNSを含む新しい受付方法は順次ご案内いたします。
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {counselors.map((counselor) => {
        const selection = normalizePlanSelection(counselor.profile_metadata);
        const enabledPlans = Object.values(COUNSELOR_PLAN_CONFIGS).filter((plan) => selection[plan.id]);
        const isAccepting = counselor.accepting_bookings && enabledPlans.length > 0;

        return (
          <Card
            key={counselor.slug}
            className="h-full border-[#f0e4d8] bg-white/95 shadow-[0_12px_30px_rgba(81,67,60,0.08)] transition-all hover:-translate-y-1"
          >
          <CardContent className="flex flex-col gap-4 p-5 h-full">
            <div className="flex items-start gap-4">
              <Image
                src={counselor.avatar_url ?? "https://placehold.co/256x256/F5F2EA/5C554F?text=User"}
                alt={counselor.display_name}
                width={160}
                height={160}
                sizes="80px"
                quality={95}
                className="h-20 w-20 rounded-full object-cover border-2 border-[#f0e4d8] flex-shrink-0 bg-[#fff8f2]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-[#51433c] truncate">{counselor.display_name}</p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      isAccepting
                        ? "text-[#4b8067] bg-[#e0f3ea]"
                        : counselor.accepting_bookings === false
                        ? "text-[#a0712b] bg-[#fff4df]"
                        : "text-[#7b7b85] bg-[#f2f2ff]"
                    }`}
                  >
                    {isAccepting ? "受付中" : counselor.accepting_bookings === false ? "受付停止中" : "準備中"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {counselor.specialties?.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] bg-[#fdeef1] text-[#51433c] px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {enabledPlans.map((plan) => (
                    <span
                      key={`${counselor.slug}-${plan.id}`}
                      className="inline-flex flex-col rounded-2xl border border-[#f0e4d8] bg-white/80 px-3 py-1 text-[11px] text-[#51433c] shadow-sm"
                    >
                      <span className="font-semibold">{plan.title}</span>
                      <span className="text-[10px] text-[#8b7a71]">¥{plan.priceYen.toLocaleString()}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-auto pt-2">
              <Link href={`/counselor/${counselor.slug}`} className="block">
                <button className="w-full rounded-full bg-[#d59da9] py-3 text-sm font-bold text-white shadow-sm shadow-[#d59da9]/25 transition-colors hover:bg-[#cf94a2]">
                  相談方法を見る
                </button>
              </Link>
            </div>
          </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
