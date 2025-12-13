import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

const MASTER_EMAIL = "goldbenchan@gmail.com";
// Password hash for "kusano" - generated with bcrypt.hashSync("kusano", 10)
const MASTER_PASSWORD_HASH = process.env.MASTER_ADMIN_PASSWORD_HASH || "$2b$10$2jTGZbIKFqg/HKcIXg6gm.Bo5tpIEcnhRWDma3oZeICeAXnMGapAi";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // Check email
    if (email !== MASTER_EMAIL) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check password
    const isValid = await bcrypt.compare(password, MASTER_PASSWORD_HASH);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Set session cookie (30 minutes)
    const cookieStore = cookies();
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    cookieStore.set("michelle-master-auth", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Master auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Logout endpoint
export async function DELETE() {
  const cookieStore = cookies();
  cookieStore.delete("michelle-master-auth");
  return NextResponse.json({ success: true });
}
