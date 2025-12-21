import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AuthGate } from "@/components/auth-gate";
import { SignOutButton } from "@/components/signout-button";
import { SiteFooter } from "@/components/site-footer";
import { SITE_NAME_EN, SITE_NAME_JP } from "@/lib/branding";
import { BookHeart, Bot, PlayCircle, CalendarHeart, Users, Settings } from "lucide-react";

export default function Home() {
  return (
    <AuthGate>
      <HomePage />
    </AuthGate>
  );
}

function HomePage() {
  const features = [
    {
      title: "感情日記",
      description: "今の気持ちを書き留める",
      icon: BookHeart,
      href: "/diary",
      color: "bg-[#fdeef1] text-[#51433c]",
    },
    {
      title: "Michelle AI",
      description: "いつでも相談できるAIパートナー",
      icon: Bot,
      href: "/michelle",
      color: "bg-[#eef7f3] text-[#51433c]",
    },
    {
      title: "動画コース",
      description: "心の仕組みを学ぶ",
      icon: PlayCircle,
      href: "/courses",
      color: "bg-[#fff0e7] text-[#51433c]",
    },
    {
      title: "カウンセリング",
      description: "専門家に相談する",
      icon: CalendarHeart,
      href: "/counselor",
      color: "bg-[#f8f1e8] text-[#51433c]",
    },
    {
      title: "みんなの日記",
      description: "公開された日記を読む",
      icon: Users,
      href: "/feed",
      color: "bg-[#f3eee7] text-[#51433c]",
    },
    {
      title: "管理者メニュー",
      description: "システム設定",
      icon: Settings,
      href: "/admin",
      color: "bg-[#f2efff] text-[#51433c]",
    },
  ];

  return (
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-10 p-4 text-center md:p-8">
        <div className="flex justify-end">
          <SignOutButton />
        </div>
        {/* Hero Section */}
        <div className="space-y-4">
          <p className="font-sans text-sm font-medium tracking-[0.4em] text-[#b29f95]">
            {SITE_NAME_EN}
          </p>
          <h1 className="font-sans text-4xl font-bold tracking-tight text-[#51433c] md:text-5xl">
            {SITE_NAME_JP}
          </h1>
          <p className="mx-auto max-w-md text-lg text-[#8b7a71]">
            あなたの心にそっと寄り添う、<br className="md:hidden" />
            やさしい居場所。
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href}>
              <Card className="h-full border border-[#f0e4d8] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
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
      </main>
      <SiteFooter />
    </div>
  );
}
