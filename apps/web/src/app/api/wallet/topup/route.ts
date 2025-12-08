import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/server/auth";
import { verifyTurnstileToken } from "@/server/turnstile";
import { topUpWallet } from "@/server/services/wallet";
import { createNotification } from "@/server/services/notifications";

const bodySchema = z.object({
  amountCents: z.number().int().positive().max(5_000_000),
  reason: z.string().max(200).optional(),
  turnstileToken: z.string().optional()
});

export async function POST(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const token = parsed.data.turnstileToken ?? request.headers.get("x-turnstile-token");
  const isHuman = await verifyTurnstileToken(token);
  if (!isHuman) {
    return NextResponse.json({ error: "Turnstile verification failed" }, { status: 400 });
  }

  try {
    const transaction = await topUpWallet(user.id, parsed.data.amountCents, {
      reason: parsed.data.reason ?? null
    });

    await createNotification({
      userId: user.id,
      channel: "in_app",
      type: "wallet.topup",
      title: "ウォレットにポイントが追加されました",
      body: `${transaction.amount_cents / 100}円相当が加算されました`,
      data: transaction
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error("Wallet top-up failed", error);
    return NextResponse.json({ error: "Unable to process top-up" }, { status: 500 });
  }
}
