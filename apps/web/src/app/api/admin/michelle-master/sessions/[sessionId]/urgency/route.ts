import { NextResponse } from "next/server";
import { verifyMasterAuth } from "@/lib/michelle-master-auth";
import { getSupabaseAdminClient } from "@/server/supabase";
import { z } from "zod";

const urgencySchema = z.object({
  level: z.enum(["normal", "attention", "urgent", "critical"]),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  // Verify master authentication
  if (!verifyMasterAuth()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = urgencySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { sessionId } = params;
    const { level, notes } = parsed.data;

    // Get master admin user ID (goldbenchan@gmail.com)
    const { data: masterUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", "goldbenchan@gmail.com")
      .single();

    // Update urgency
    const { error } = await supabase
      .from("michelle_sessions")
      .update({
        urgency_level: level,
        urgency_notes: notes || null,
        urgency_updated_at: new Date().toISOString(),
        urgency_updated_by: masterUser?.id || null,
      })
      .eq("id", sessionId);

    if (error) {
      console.error("Failed to update urgency:", error);
      return NextResponse.json({ error: "Failed to update urgency" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Urgency update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
