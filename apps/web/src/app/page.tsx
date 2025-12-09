import Link from "next/link";
import { cookies } from "next/headers";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { BookHeart, Bot, PlayCircle, CalendarHeart, Users, Settings } from "lucide-react";

type Feature = {
  title: string;
  description: string;
  icon: typeof BookHeart;
  href: string;
  color: string;
  requireAdmin?: boolean;
};

const BASE_FEATURES: Feature[] = [
  {
    title: "感情日記",
    description: "今の気持ちを書き留める",
    icon: BookHeart,
    href: "/diary",
    color: "bg-tape-pink/20 text-tape-brown"
  },
  {
    title: "Michelle AI",
    description: "いつでも相談できるAIパートナー",
    icon: Bot,
    href: "/michelle",
    color: "bg-tape-green/20 text-tape-brown"
  },
  {
    title: "動画コース",
    description: "心の仕組みを学ぶ",
    icon: PlayCircle,
    href: "/course/beginner",
    color: "bg-tape-orange/20 text-tape-brown"
  },
  {
    title: "カウンセリング",
    description: "専門家に相談する",
    icon: CalendarHeart,
    href: "/counselor",
    color: "bg-tape-beige text-tape-brown"
  },
  {
    title: "みんなの日記",
    description: "公開された日記を読む",
    icon: Users,
    href: "/feed",
    color: "bg-tape-light-brown/10 text-tape-brown"
  },
  {
    title: "管理者メニュー",
    description: "システム設定",
    icon: Settings,
    href: "/admin",
    color: "bg-gray-100 text-gray-600",
    requireAdmin: true
  }
];

export default async function Home() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let user = null;
  let authUnavailable = false;

  try {
    user = await getRouteUser(supabase, "Home page");
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      authUnavailable = true;
    } else {
      throw error;
    }
  }

  if (!user || authUnavailable) {
    return <LoginGate showServiceError={authUnavailable} />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  return <AuthenticatedHome isAdmin={isAdmin} />;
}

function LoginGate({ showServiceError }: { showServiceError: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <main className="w-full max-w-md space-y-6">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">TAPE PSYCHOLOGY</p>
          <h1 className="text-3xl font-bold text-tape-brown">ログインしてください</h1>
          <p className="text-sm text-tape-light-brown">
            Tape式心理学のコンテンツをご利用いただくには、メールアドレスでのログインが必要です。
          </p>
        </div>

        {showServiceError && (
          <p className="rounded-2xl border border-tape-pink/30 bg-tape-pink/10 px-4 py-3 text-xs text-tape-pink">
            現在、認証サービスに接続しづらい状態です。時間を置いて再度お試しください。
          </p>
        )}

        <section className="rounded-3xl border border-tape-beige bg-white p-6 shadow-sm">
          <MagicLinkForm />
        </section>

        <p className="text-center text-xs text-tape-light-brown">
          ログイン後、感情日記やMichelle AIなどすべての機能をご利用いただけます。
        </p>
      </main>
    </div>
  );
}

function AuthenticatedHome({ isAdmin }: { isAdmin: boolean }) {
  const features = BASE_FEATURES.filter((feature) => (feature.requireAdmin ? isAdmin : true));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <main className="w-full max-w-2xl space-y-10 text-center">
        <div className="flex justify-end">
          <Link href="/auth/signout?redirectTo=/login">
            <Button variant="ghost" size="sm" className="text-tape-light-brown">
              ログアウト
            </Button>
          </Link>
        </div>
        <div className="space-y-4">
          <p className="font-sans text-sm font-medium tracking-widest text-tape-light-brown">TAPE PSYCHOLOGY</p>
          <h1 className="font-sans text-4xl font-bold tracking-tight text-tape-brown md:text-5xl">テープ式心理学</h1>
          <p className="mx-auto max-w-md text-lg text-tape-light-brown">
            あなたの心にそっと寄り添う、<br className="md:hidden" />
            やさしい居場所。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href}>
              <Card className="h-full border-none shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <CardContent className="flex flex-col items-center justify-center space-y-3 p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${feature.color}`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-tape-brown">{feature.title}</h3>
                    <p className="text-xs text-tape-light-brown">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-sm text-tape-light-brown/60">© 2024 Tape Psychology. All rights reserved.</div>
      </main>
    </div>
  );
}
