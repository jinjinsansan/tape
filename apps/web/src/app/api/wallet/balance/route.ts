import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser } from "@/lib/supabase/auth-helpers";
import { getOrCreateWallet } from "@/server/services/wallet";
import { getSupabaseAdminClient } from "@/server/supabase";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  try {
    const user = await getRouteUser(supabase, "Get wallet balance");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wallet = await getOrCreateWallet(user.id);

    // Get recent transactions
    const adminSupabase = getSupabaseAdminClient();
    const { data: transactions, error: txError } = await adminSupabase
      .from("transactions")
      .select("id, type, amount_cents, balance_after_cents, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (txError) {
      console.error("Failed to get transactions:", txError);
    }

    return NextResponse.json({
      wallet: {
        balance_cents: wallet.balance_cents,
        currency: wallet.currency,
        status: wallet.status,
      },
      transactions: transactions ?? [],
    });
  } catch (error) {
    console.error("Failed to get wallet balance", error);
    return NextResponse.json({ error: "Failed to get wallet balance" }, { status: 500 });
  }
}
