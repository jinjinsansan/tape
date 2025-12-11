import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/server/auth";
import { verifyTurnstileToken } from "@/server/turnstile";
import { consumeWallet } from "@/server/services/wallet";
import { createNotification } from "@/server/services/notifications";

const bodySchema = z.object({
  amountCents: z.number().int().positive().max(5_000_000),
  description: z.string().max(200).optional(),
  turnstileToken: z.string().optional()
});

export async function POST(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const token = parsed.data.turnstileToken ?? request.headers.get("x-turnstile-token");
  const isHuman = await verifyTurnstileToken(token);
  if (!isHuman) {
    return NextResponse.json({ error: "Turnstile verification failed" }, { status: 400 });
  }

  try {
    const transaction = await consumeWallet(user.id, parsed.data.amountCents, {
      description: parsed.data.description ?? null
    });

    await createNotification({
      userId: user.id,
      channel: "in_app",
      type: "wallet.consume",
      category: "wallet",
      title: "ポイントを利用しました",
      body: `${Math.abs(transaction.amount_cents) / 100}円相当を消費しました`,
      data: transaction
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error("Wallet consumption failed", error);
    const message = error instanceof Error ? error.message : "Unable to consume";
    const status = message.includes("INSUFFICIENT_FUNDS") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
