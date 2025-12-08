import { NextResponse } from "next/server";
import { z } from "zod";

import { listAvailableSlots, getCounselor, CounselorNotFoundError } from "@/server/services/counselors";

const paramsSchema = z.object({ slug: z.string().min(1) });

export async function GET(_: Request, context: { params: { slug: string } }) {
  const { slug } = paramsSchema.parse(context.params);
  try {
    const counselor = await getCounselor(slug);
    const slots = await listAvailableSlots(counselor.id);
    return NextResponse.json({ slots });
  } catch (error) {
    if (error instanceof CounselorNotFoundError) {
      return NextResponse.json({ error: "Counselor not found" }, { status: 404 });
    }
    console.error("Failed to load slots", error);
    return NextResponse.json({ error: "Failed to load slots" }, { status: 500 });
  }
}
