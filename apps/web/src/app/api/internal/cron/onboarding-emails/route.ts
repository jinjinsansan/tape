import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase";
import { sendOnboardingEmail } from "@/server/services/onboarding-emails";

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRON_SECRET = process.env.CRON_SECRET ?? process.env.DIARY_AI_CRON_SECRET;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const authorizeCron = (request: Request) => {
  if (!CRON_SECRET) {
    return true;
  }

  const header = request.headers.get("x-cron-secret");
  if (header && header === CRON_SECRET) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader === `Bearer ${CRON_SECRET}`) {
    return true;
  }

  return false;
};

const handleCron = async () => {
  const startTime = Date.now();
  console.log("[Onboarding Emails Cron] Starting...");

  try {
    const supabase = getSupabaseAdminClient();
    const today = new Date();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, onboarding_email_step, onboarding_email_started_at, onboarding_email_completed, created_at")
      .eq("onboarding_email_enabled", true)
      .eq("onboarding_email_completed", false);

    if (error) {
      throw error;
    }

    const results = {
      total: profiles?.length || 0,
      sent: 0,
      skipped: 0,
      completed: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const profile of profiles || []) {
      try {
        const previousStep = profile.onboarding_email_step ?? 0;
        const originalStartedAt = profile.onboarding_email_started_at ?? null;
        const shouldResetStart = previousStep === 0;
        const referenceStart = shouldResetStart
          ? today
          : originalStartedAt
            ? new Date(originalStartedAt)
            : new Date(profile.created_at ?? today.toISOString());

        const daysSinceStart = Math.floor((today.getTime() - referenceStart.getTime()) / MS_PER_DAY);

        let targetStep: OnboardingStep;

        if (shouldResetStart) {
          targetStep = 1;
        } else {
          const desiredStep = daysSinceStart + 1;

          if (desiredStep > 8) {
            const { error: completeError } = await supabase
              .from("profiles")
              .update({ onboarding_email_completed: true, onboarding_email_step: 8 })
              .eq("id", profile.id);

            if (completeError) {
              throw new Error(`Failed to mark user ${profile.id} complete: ${completeError.message}`);
            }

            results.completed++;
            continue;
          }

          targetStep = desiredStep as OnboardingStep;

          if (previousStep >= targetStep) {
            results.skipped++;
            continue;
          }
        }

        if (targetStep > 8) {
          const { error: completeError } = await supabase
            .from("profiles")
            .update({ onboarding_email_completed: true, onboarding_email_step: 8 })
            .eq("id", profile.id);

          if (completeError) {
            throw new Error(`Failed to mark user ${profile.id} complete: ${completeError.message}`);
          }

          results.completed++;
          continue;
        }

        const updates: Record<string, unknown> = {
          onboarding_email_step: targetStep,
          onboarding_email_completed: targetStep === 8
        };

        if (shouldResetStart || !originalStartedAt) {
          updates.onboarding_email_started_at = referenceStart.toISOString();
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", profile.id);

        if (updateError) {
          throw new Error(`Failed to update user ${profile.id}: ${updateError.message}`);
        }

        const success = await sendOnboardingEmail(profile.id, targetStep);

        if (success) {
          results.sent++;
        } else {
          results.failed++;
          const message = `Failed to send step ${targetStep} to user ${profile.id}`;
          results.errors.push(message);
          console.error(message);

          const revertPayload: Record<string, unknown> = {
            onboarding_email_step: previousStep,
            onboarding_email_completed: profile.onboarding_email_completed ?? false
          };

          if (shouldResetStart || !originalStartedAt) {
            revertPayload.onboarding_email_started_at = originalStartedAt;
          }

          await supabase
            .from("profiles")
            .update(revertPayload)
            .eq("id", profile.id)
            .catch((revertError) => {
              console.error(`Failed to revert user ${profile.id} after send failure:`, revertError);
            });
        }
      } catch (error) {
        results.failed++;
        const message = error instanceof Error ? error.message : String(error);
        results.errors.push(`Error processing user ${profile.id}: ${message}`);
        console.error(`Error processing user ${profile.id}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Onboarding Emails Cron] Completed in ${duration}ms`, results);

    return NextResponse.json({
      success: true,
      duration,
      results
    });
  } catch (error) {
    console.error("[Onboarding Emails Cron] Failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
};

/**
 * Send onboarding emails based on registration date
 * Triggered daily at 12:00 JST (03:00 UTC)
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return handleCron();
}

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return handleCron();
}
