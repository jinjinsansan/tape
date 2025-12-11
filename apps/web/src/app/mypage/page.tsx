import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { MyPageClient } from "./my-page-client";
import { MyBookingsClient } from "./my-bookings-client";
import { WalletClient } from "./wallet-client";

export default async function MyPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  let user;

  try {
    user = await getRouteUser(supabase, "My page");
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      redirect("/login?error=認証サービスに接続できませんでした。再度お試しください。");
    }
    throw error;
  }

  if (!user) {
    redirect("/login?error=マイページにアクセスするにはログインが必要です");
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

  return (
    <main className="min-h-screen bg-tape-cream px-4 py-12 md:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">MY PAGE</p>
          <h1 className="text-3xl font-bold text-tape-brown">プロフィール設定</h1>
          <p className="text-sm text-tape-light-brown">
            「みんなの日記」や各種サービスで表示される情報をここで変更できます。
          </p>
        </header>

        <Card className="border-tape-beige bg-white/90 shadow-sm">
          <CardContent className="p-6">
            <h2 className="mb-6 text-xl font-bold text-tape-brown">ウォレット</h2>
            <WalletClient />
          </CardContent>
        </Card>

        <Card className="border-tape-beige bg-white/90 shadow-sm">
          <CardContent className="p-6">
            <h2 className="mb-6 text-xl font-bold text-tape-brown">カウンセリング予約</h2>
            <MyBookingsClient />
          </CardContent>
        </Card>

        <Card className="border-tape-beige bg-white/90 shadow-sm">
          <CardContent className="p-6">
            <MyPageClient initialProfile={initialProfile} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
