import { NextResponse } from "next/server";

import { listCounselors } from "@/server/services/counselors";

export async function GET() {
  try {
    const counselors = await listCounselors();
    return NextResponse.json({ counselors });
  } catch (error) {
    console.error("Failed to list counselors", error);
    return NextResponse.json({ error: "Failed to load counselors" }, { status: 500 });
  }
}
