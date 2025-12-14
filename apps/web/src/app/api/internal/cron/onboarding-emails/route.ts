import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase";
import { sendOnboardingEmail } from "@/server/services/onboarding-emails";

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Send onboarding emails based on registration date
 * Triggered daily at 12:00 JST (03:00 UTC)
 */
export async function GET() {
  const startTime = Date.now();
  console.log("[Onboarding Emails Cron] Starting...");

  try {
    const supabase = getSupabaseAdminClient();
    const today = new Date();
    
    // Get all users who have onboarding emails enabled and not completed
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, onboarding_email_step, onboarding_email_started_at, created_at")
      .eq("onboarding_email_enabled", true)
      .eq("onboarding_email_completed", false)
      .not("onboarding_email_started_at", "is", null);

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
        const startedAt = new Date(profile.onboarding_email_started_at);
        const daysSinceStart = Math.floor((today.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        // For new users (step 0), send step 1 immediately
        // For others, determine which step based on days since start
        let targetStep: OnboardingStep;
        
        if (profile.onboarding_email_step === 0) {
          // New user: send step 1
          targetStep = 1;
        } else {
          // Existing user: daysSinceStart 0=step1, 1=step2, 2=step3, ...
          targetStep = (daysSinceStart + 1) as OnboardingStep;
          
          // Skip if already sent this step or beyond
          if (profile.onboarding_email_step >= targetStep) {
            results.skipped++;
            continue;
          }
        }
        
        // Skip if target step is beyond 8
        if (targetStep > 8) {
          // Mark as completed
          await supabase
            .from("profiles")
            .update({ 
              onboarding_email_completed: true,
              onboarding_email_step: 8
            })
            .eq("id", profile.id);
          
          results.completed++;
          continue;
        }
        
        // Send the email
        const success = await sendOnboardingEmail(profile.id, targetStep);
        
        if (success) {
          // Update the step
          await supabase
            .from("profiles")
            .update({ 
              onboarding_email_step: targetStep,
              onboarding_email_completed: targetStep === 8
            })
            .eq("id", profile.id);
          
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`Failed to send step ${targetStep} to user ${profile.id}`);
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
}
