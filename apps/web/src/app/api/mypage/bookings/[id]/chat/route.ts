import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Get chat messages");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = getSupabaseAdminClient();

    // Verify booking belongs to user and get chat ID
    const { data: booking, error: bookingError } = await adminSupabase
      .from("counselor_bookings")
      .select("intro_chat_id")
      .eq("id", params.id)
      .eq("client_user_id", user.id)
      .maybeSingle();

    if (bookingError) {
      throw bookingError;
    }

    if (!booking || !booking.intro_chat_id) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Get messages
    const { data: messages, error: messagesError } = await adminSupabase
      .from("counselor_intro_messages")
      .select("id, body, role, created_at, sender_user_id")
      .eq("chat_id", booking.intro_chat_id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    // Get sender profiles
    const senderIds = [...new Set(messages?.map(m => m.sender_user_id) ?? [])];
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", senderIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);

    const messagesWithProfiles = messages?.map(msg => ({
      id: msg.id,
      body: msg.body,
      role: msg.role,
      created_at: msg.created_at,
      sender: {
        id: msg.sender_user_id,
        display_name: profileMap.get(msg.sender_user_id)?.display_name ?? "Unknown",
        avatar_url: profileMap.get(msg.sender_user_id)?.avatar_url,
      },
    })) ?? [];

    return NextResponse.json({
      chatId: booking.intro_chat_id,
      messages: messagesWithProfiles,
    });
  } catch (error) {
    console.error("Failed to get chat messages", error);
    return NextResponse.json({ error: "Failed to get chat messages" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Send chat message");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdminClient();

    // Verify booking belongs to user and get chat ID
    const { data: booking, error: bookingError } = await adminSupabase
      .from("counselor_bookings")
      .select("intro_chat_id")
      .eq("id", params.id)
      .eq("client_user_id", user.id)
      .maybeSingle();

    if (bookingError) {
      throw bookingError;
    }

    if (!booking || !booking.intro_chat_id) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Insert message
    const { data: newMessage, error: messageError } = await adminSupabase
      .from("counselor_intro_messages")
      .insert({
        chat_id: booking.intro_chat_id,
        sender_user_id: user.id,
        body: message.trim(),
        role: "client",
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

    return NextResponse.json({ message: newMessage });
  } catch (error) {
    console.error("Failed to send message", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
