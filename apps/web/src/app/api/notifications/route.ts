import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/server/auth";
import { listNotifications, markNotificationRead } from "@/server/services/notifications";

export async function GET(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notifications = await listNotifications(user.id);
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Failed to list notifications", error);
    return NextResponse.json({ error: "Unable to fetch notifications" }, { status: 500 });
  }
}

const markSchema = z.object({
  ids: z.array(z.string().uuid()).min(1)
});

export async function PATCH(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = markSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    await Promise.all(
      parsed.data.ids.map((id) => markNotificationRead(id, user.id))
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark notifications", error);
    return NextResponse.json({ error: "Unable to mark notifications" }, { status: 500 });
  }
}
