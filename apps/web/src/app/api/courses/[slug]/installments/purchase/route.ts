import { NextResponse } from "next/server";

import { getRouteUser } from "@/server/auth";
import { getSupabaseAdminClient } from "@/server/supabase";
import { isPrivilegedUser } from "@/server/services/roles";
import { getCourseForUser, getInstallmentCourseConfig } from "@/server/services/courses";
import { consumeWallet, getOrCreateWallet, topUpWallet } from "@/server/services/wallet";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    const installmentConfig = getInstallmentCourseConfig(slug);
    if (!installmentConfig) {
      return NextResponse.json({ error: "このコースでは分割購入は利用できません" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const user = await getRouteUser();
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const isPrivileged = await isPrivilegedUser(user.id, supabase);
    if (isPrivileged) {
      return NextResponse.json({ error: "管理者/カウンセラーは購入不要です" }, { status: 400 });
    }

    const courseView = await getCourseForUser(slug, user.id, { isPrivileged });
    if (courseView.viewer.hasFullCourseAccess) {
      return NextResponse.json({ error: "このコースは既に購入済みです" }, { status: 400 });
    }

    const flatLessons = courseView.modules.flatMap((module) => module.lessons);
    const nextLocked = flatLessons.find((lesson) => !lesson.isUnlocked);
    if (!nextLocked) {
      return NextResponse.json({ error: "購入可能なレッスンはありません" }, { status: 400 });
    }

    const wallet = await getOrCreateWallet(user.id);
    if (wallet.balance_cents < installmentConfig.lessonPriceCents) {
      return NextResponse.json({ error: "ウォレット残高が不足しています" }, { status: 400 });
    }

    await consumeWallet(user.id, installmentConfig.lessonPriceCents, {
      reason: "course_installment",
      courseId: courseView.id,
      lessonId: nextLocked.id
    });

    try {
      const { error: unlockError } = await supabase.from("learning_lesson_unlocks").insert({
        user_id: user.id,
        course_id: courseView.id,
        lesson_id: nextLocked.id,
        amount_cents: installmentConfig.lessonPriceCents,
        metadata: {
          lessonTitle: nextLocked.title,
          courseTitle: courseView.title
        }
      });

      if (unlockError) {
        throw unlockError;
      }
    } catch (unlockError) {
      try {
        await topUpWallet(user.id, installmentConfig.lessonPriceCents, {
          reason: "course_installment_refund",
          courseId: courseView.id,
          lessonId: nextLocked.id,
          error: unlockError instanceof Error ? unlockError.message : String(unlockError)
        });
      } catch (refundError) {
        console.error("Failed to refund installment purchase", refundError);
        throw new Error("分割購入の処理に失敗し、ウォレット返金も完了しませんでした");
      }

      if ((unlockError as { code?: string })?.code === "23505") {
        return NextResponse.json({ error: "このレッスンは既に購入済みです" }, { status: 400 });
      }

      console.error("Failed to record installment unlock", unlockError);
      throw unlockError instanceof Error ? unlockError : new Error("Failed to record installment unlock");
    }

    return NextResponse.json({
      success: true,
      lessonId: nextLocked.id,
      lessonTitle: nextLocked.title,
      priceYen: installmentConfig.lessonPriceYen
    });
  } catch (error) {
    console.error("Failed to process installment purchase", error);
    return NextResponse.json({ error: "分割購入の処理に失敗しました" }, { status: 500 });
  }
}
