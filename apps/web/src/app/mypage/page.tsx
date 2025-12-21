import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { MyPageClient } from "./my-page-client";
import { MyBookingsClient } from "./my-bookings-client";
import { WalletClient } from "./wallet-client";
import { NotificationsClient } from "./notifications-client";

export default async function MyPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  let user;

  try {
    user = await getRouteUser(supabase, "My page");
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      redirect("/?error=認証サービスに接続できませんでした。再度お試しください。");
    }
    throw error;
  }

  if (!user) {
    redirect("/?error=マイページにアクセスするにはログインが必要です");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const initialProfile = {
    displayName:
      profile?.display_name ??
      (typeof user.user_metadata?.full_name === "string" ? (user.user_metadata.full_name as string) : null) ??
      user.email?.split("@")[0] ??
      null,
    avatarUrl: profile?.avatar_url ?? null,
    email: user.email ?? null
  };

  const sections = [
    { title: "お知らせ受信箱", content: <NotificationsClient /> },
    { title: "ウォレット", content: <WalletClient /> },
    { title: "カウンセリング予約", content: <MyBookingsClient /> }
  ];

  return (
    <div className="bg-gradient-to-b from-[#fff8f2] via-[#f9f3ff] to-[#f2fbff]">
      <main className="min-h-screen px-4 py-12 md:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold tracking-[0.4em] text-[#92b4d6]">MY PAGE</p>
            <h1 className="text-3xl font-bold text-[#51433c]">プロフィール設定</h1>
            <p className="text-sm text-[#8b7a71]">
              「みんなの日記」や各種サービスで表示される情報をここで変更できます。
            </p>
          </header>

          {sections.map((section) => (
            <Card key={section.title} className="border-[#f0e4d8] bg-white/95 shadow-[0_18px_38px_rgba(81,67,60,0.07)]">
              <CardContent className="p-6">
                <h2 className="mb-6 text-xl font-bold text-[#51433c]">{section.title}</h2>
                {section.content}
              </CardContent>
            </Card>
          ))}

          <Card className="border-[#f0e4d8] bg-white/95 shadow-[0_18px_38px_rgba(81,67,60,0.07)]">
            <CardContent className="p-6">
              <MyPageClient initialProfile={initialProfile} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
