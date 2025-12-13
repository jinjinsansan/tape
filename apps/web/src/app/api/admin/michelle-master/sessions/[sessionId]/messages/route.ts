import { NextResponse } from "next/server";
import { verifyMasterAuth } from "@/lib/michelle-master-auth";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  // Verify master authentication
  if (!verifyMasterAuth()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { sessionId } = params;

    // Get all messages for the session
    const { data: messages, error } = await supabase
      .from("michelle_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch messages:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
