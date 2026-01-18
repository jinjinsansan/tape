import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { deleteNotifications, listNotifications, markNotificationRead } from "@/server/services/notifications";
import type { NotificationCategory } from "@tape/supabase";

const categorySchema = z.enum(["all", "announcement", "booking", "wallet", "other"]);

const markSchema = z.object({
  ids: z.array(z.string().uuid()).min(1)
});

const deleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1)
});

const getUser = async () => {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  try {
    const user = await getRouteUser(supabase, "My page notifications");
    if (!user) {
      return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
    }
    return { response: null, user };
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return {
        response: NextResponse.json(
          { error: "認証サービスに接続できませんでした" },
          { status: 503 }
        ),
        user: null
      };
    }
    throw error;
  }
};

export async function GET(request: Request) {
  const { response, user } = await getUser();
  if (response) return response;

  const url = new URL(request.url);
  const categoryParam = url.searchParams.get("category");
  let category: NotificationCategory | undefined;
  if (categoryParam && categoryParam !== "all") {
    const parsed = categorySchema.safeParse(categoryParam);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (parsed.data !== "all") {
      category = parsed.data as NotificationCategory;
    }
  }

  try {
    const notifications = await listNotifications(user!.id, {
      category,
      limit: 100,
      includeRead: true
    });
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Failed to fetch mypage notifications", error);
    return NextResponse.json({ error: "お知らせの取得に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { response, user } = await getUser();
  if (response) return response;

  const parsed = markSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    await Promise.all(parsed.data.ids.map((id) => markNotificationRead(id, user!.id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark notifications read", error);
    return NextResponse.json({ error: "既読更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { response, user } = await getUser();
  if (response) return response;

  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    await deleteNotifications(parsed.data.ids, user!.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete notifications", error);
    return NextResponse.json({ error: "お知らせの削除に失敗しました" }, { status: 500 });
  }
}
