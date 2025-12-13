import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { verifyMasterAuth } from "@/lib/michelle-master-auth";
import { cookies } from "next/headers";
import type { Database } from "@tape/supabase";

export async function GET() {
  // Verify master authentication
  if (!verifyMasterAuth()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cookieStore = cookies();
    const supabase = createSupabaseRouteClient<Database>(cookieStore);

    // Get all psychology sessions (category='life') with user info, ordered by urgency and recent activity
    const { data: sessions, error } = await supabase
      .from("michelle_sessions")
      .select(`
        id,
        auth_user_id,
        category,
        title,
        urgency_level,
        urgency_notes,
        urgency_updated_at,
        urgency_updated_by,
        created_at,
        updated_at,
        profiles:auth_user_id (
          id,
          display_name,
          email
        )
      `)
      .eq("category", "life")
      .order("urgency_level", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch sessions:", error);
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }

    // Count messages for each session
    const sessionsWithCounts = await Promise.all(
      (sessions || []).map(async (session) => {
        const { count } = await supabase
          .from("michelle_messages")
          .select("*", { count: "exact", head: true })
          .eq("session_id", session.id);

        return {
          ...session,
          message_count: count || 0,
        };
      })
    );

    return NextResponse.json({ sessions: sessionsWithCounts });
  } catch (error) {
    console.error("Sessions fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
