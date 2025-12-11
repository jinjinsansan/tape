import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { deleteSlot, getSlot, getCounselorByAuthUser } from "@/server/services/counselors";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function DELETE(_: Request, context: { params: { id: string } }) {
  const { id } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Admin delete slot");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Failed to load profile", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 500 });
    }

    if (profile.role !== "admin" && profile.role !== "counselor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (profile.role === "counselor") {
      const slot = await getSlot(id);
      const myCounselor = await getCounselorByAuthUser(user.id);
      
      if (!myCounselor || !slot || slot.counselor_id !== myCounselor.id) {
        return NextResponse.json({ error: "Unauthorized to delete this slot" }, { status: 403 });
      }
    }

    await deleteSlot(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete slot", error);
    return NextResponse.json({ error: "Failed to delete slot" }, { status: 500 });
  }
}
