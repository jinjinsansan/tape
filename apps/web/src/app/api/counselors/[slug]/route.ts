import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { getCounselor, CounselorNotFoundError } from "@/server/services/counselors";

const paramsSchema = z.object({ slug: z.string().min(1) });

export async function GET(_: Request, context: { params: { slug: string } }) {
  const { slug } = paramsSchema.parse(context.params);
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  let viewerId: string | null = null;
  try {
    const user = await getRouteUser(supabase, `Counselor detail: ${slug}`);
    viewerId = user?.id ?? null;
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    throw error;
  }

  try {
    const counselor = await getCounselor(slug);
    return NextResponse.json({ counselor, viewerId });
  } catch (error) {
    if (error instanceof CounselorNotFoundError) {
      return NextResponse.json({ error: "Counselor not found" }, { status: 404 });
    }
    console.error("Failed to load counselor", error);
    return NextResponse.json({ error: "Failed to load counselor" }, { status: 500 });
  }
}
