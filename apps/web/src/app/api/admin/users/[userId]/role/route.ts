import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/server/supabase";
import { ensureAdmin } from "@/app/api/admin/_lib/ensure-admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const { response } = await ensureAdmin(supabase, "Update user role");
  if (response) return response;

  const { userId } = params;
  const body = await request.json();
  const { role, counselorActive } = body as { role?: string; counselorActive?: boolean };

  if (!role || !['admin', 'counselor', 'member', 'user'].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be admin, counselor, member, or user" },
      { status: 400 }
    );
  }

  const adminSupabase = getSupabaseAdminClient();

  const ensureCounselorActive = async () => {
    // プロフィール情報を取得
    const { data: profile, error: fetchError } = await adminSupabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    if (fetchError) {
      console.error("Failed to fetch profile", fetchError);
      throw fetchError;
    }

    // auth.users から email を取得
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(userId);

    if (authError) {
      console.error("Failed to fetch auth user", authError);
      throw authError;
    }

    const displayName = profile?.display_name || authUser.user.email?.split("@")[0] || "カウンセラー";
    const slug = `counselor-${userId.substring(0, 8)}`;

    const { data: existingCounselor } = await adminSupabase
      .from("counselors")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (existingCounselor) {
      const { error: reactivateError } = await adminSupabase
        .from("counselors")
        .update({ is_active: true })
        .eq("auth_user_id", userId);

      if (reactivateError) {
        console.error("Failed to reactivate counselor", reactivateError);
        throw reactivateError;
      }
    } else {
      const { error: counselorError } = await adminSupabase
        .from("counselors")
        .insert({
          auth_user_id: userId,
          slug,
          display_name: displayName,
          is_active: true,
          hourly_rate_cents: 12000
        });

      if (counselorError) {
        console.error("Failed to create counselor", counselorError);
        throw counselorError;
      }
    }
  };

  const deactivateCounselor = async () => {
    const { error: deactivateError } = await adminSupabase
      .from("counselors")
      .update({ is_active: false })
      .eq("auth_user_id", userId);

    if (deactivateError) {
      console.error("Failed to deactivate counselor", deactivateError);
      // これは致命的エラーではないのでログのみ
    }
  };

  try {
    const { error: profileError } = await adminSupabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (profileError) {
      console.error("Failed to update profile role", profileError);
      throw profileError;
    }

    if (typeof counselorActive === "boolean") {
      if (counselorActive) {
        await ensureCounselorActive();
      } else {
        await deactivateCounselor();
      }
    } else if (role === "counselor") {
      await ensureCounselorActive();
    } else if (role === "user" || role === "member") {
      await deactivateCounselor();
    }

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Failed to update user role", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}
