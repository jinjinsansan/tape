import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookHeart, Bot, PlayCircle, CalendarHeart, Users, Settings } from "lucide-react";

export default function Home() {
  const features = [
    {
      title: "感情日記",
      description: "今の気持ちを書き留める",
      icon: BookHeart,
      href: "/diary",
      color: "bg-tape-pink/20 text-tape-brown",
    },
    {
      title: "Michelle AI",
      description: "いつでも相談できるAIパートナー",
      icon: Bot,
      href: "/michelle",
      color: "bg-tape-green/20 text-tape-brown",
    },
    {
      title: "動画コース",
      description: "心の仕組みを学ぶ",
      icon: PlayCircle,
      href: "/course/beginner",
      color: "bg-tape-orange/20 text-tape-brown",
    },
    {
      title: "カウンセリング",
      description: "専門家に相談する",
      icon: CalendarHeart,
      href: "/counselor",
      color: "bg-tape-beige text-tape-brown",
    },
    {
      title: "みんなの広場",
      description: "気持ちを共有する",
      icon: Users,
      href: "/feed",
      color: "bg-tape-light-brown/10 text-tape-brown",
    },
    {
      title: "管理者メニュー",
      description: "システム設定",
      icon: Settings,
      href: "/admin",
      color: "bg-gray-100 text-gray-600",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <main className="w-full max-w-2xl space-y-10 text-center">
        {/* Hero Section */}
        <div className="space-y-4">
          <p className="font-sans text-sm font-medium tracking-widest text-tape-light-brown">
            TAPE PSYCHOLOGY
          </p>
          <h1 className="font-sans text-4xl font-bold tracking-tight text-tape-brown md:text-5xl">
            テープ式心理学
          </h1>
          <p className="mx-auto max-w-md text-lg text-tape-light-brown">
            あなたの心にそっと寄り添う、<br className="md:hidden" />
            やさしい居場所。
          </p>
        </div>

        {/* Feature Grid */}
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

        {/* Footer/Note */}
        <div className="text-sm text-tape-light-brown/60">
          © 2024 Tape Psychology. All rights reserved.
        </div>
      </main>
    </div>
  );
}
