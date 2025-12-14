import { NextResponse } from "next/server";
import { verifyMasterAuth } from "@/lib/michelle-master-auth";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function GET() {
  // Verify master authentication
  if (!verifyMasterAuth()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();

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
        updated_at
      `)
      .eq("category", "life")
      .order("urgency_level", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch sessions:", error);
      return NextResponse.json({ error: "Failed to fetch sessions", details: error.message }, { status: 500 });
    }

    // Fetch profiles separately to avoid relation issues
    const userIds = [...new Set((sessions || []).map(s => s.auth_user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    // Get user emails from auth
    const profilesWithEmail = await Promise.all(
      userIds.map(async (userId) => {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const profile = profiles?.find(p => p.id === userId);
        return {
          id: userId,
          display_name: profile?.display_name || null,
          email: userData?.user?.email || null,
        };
      })
    );

    const profileMap = new Map(profilesWithEmail.map(p => [p.id, p]));

    // Count messages for each session and attach profile data
    const sessionsWithCounts = await Promise.all(
      (sessions || []).map(async (session) => {
        const { count } = await supabase
          .from("michelle_messages")
          .select("*", { count: "exact", head: true })
          .eq("session_id", session.id);

        return {
          ...session,
          message_count: count || 0,
          profiles: profileMap.get(session.auth_user_id) || null,
        };
      })
    );

    return NextResponse.json({ sessions: sessionsWithCounts });
  } catch (error) {
    console.error("Sessions fetch error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
