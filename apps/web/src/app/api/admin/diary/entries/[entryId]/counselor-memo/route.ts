import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { getRouteUser } from "@/lib/supabase/auth-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const user = await getRouteUser(supabase, "Update counselor memo");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // admin または counselor のみアクセス可能
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !['admin', 'counselor'].includes(profile.role)) {
    return NextResponse.json(
      { error: "Access denied. Admin or counselor role required." },
      { status: 403 }
    );
  }

  const { entryId } = params;
  const body = await request.json();
  const {
    counselorMemo,
    isVisibleToUser,
    assignedCounselor,
    urgencyLevel
  } = body;

  const adminSupabase = getSupabaseAdminClient();

  try {
    // カウンセラー名を取得
    let counselorName = profile.display_name || "カウンセラー";

    // counselors テーブルから正式な名前を取得（存在する場合）
    const { data: counselorData } = await adminSupabase
      .from("counselors")
      .select("display_name")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (counselorData?.display_name) {
      counselorName = counselorData.display_name;
    }

    // 更新データを構築（空文字列の場合は既存値を保持）
    const updateData: any = {
      counselor_memo: counselorMemo ?? "",
      counselor_name: counselorName,
      is_visible_to_user: isVisibleToUser ?? false
    };

    // assigned_counselor と urgency_level は空でない場合のみ更新
    if (assignedCounselor !== undefined && assignedCounselor !== null && assignedCounselor.trim() !== "") {
      updateData.assigned_counselor = assignedCounselor;
    }

    if (urgencyLevel !== undefined && urgencyLevel !== null && urgencyLevel.trim() !== "") {
      updateData.urgency_level = urgencyLevel;
    }

    const { data, error } = await adminSupabase
      .from("emotion_diary_entries")
      .update(updateData)
      .eq("id", entryId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update counselor memo", error);
      throw error;
    }

    return NextResponse.json({ entry: data });
  } catch (error) {
    console.error("Failed to save counselor memo", error);
    return NextResponse.json(
      { error: "Failed to save memo" },
      { status: 500 }
    );
  }
}
