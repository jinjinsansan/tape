import type { Database, Json, TransactionType } from "@tape/supabase";
import { getSupabaseAdminClient } from "@/server/supabase";

const client = () => getSupabaseAdminClient();

export const getOrCreateWallet = async (userId: string) => {
  const supabase = client();
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: created, error: insertError } = await supabase
    .from("wallets")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  return created;
};

type WalletTransactionParams = {
  userId: string;
  amountCents: number;
  type: TransactionType;
  metadata?: Json;
  isCredit: boolean;
};

const performWalletTransaction = async (params: WalletTransactionParams) => {
  const supabase = client();
  const { data, error } = await supabase.rpc("perform_wallet_transaction", {
    p_user_id: params.userId,
    p_amount_cents: params.amountCents,
    p_is_credit: params.isCredit,
    p_type: params.type,
    p_metadata: params.metadata ?? null
  });

  if (error) {
    throw error;
  }

  return data as Database["public"]["Tables"]["transactions"]["Row"];
};

export const topUpWallet = (userId: string, amountCents: number, metadata?: Json) =>
  performWalletTransaction({
    userId,
    amountCents,
    type: "topup",
    isCredit: true,
    metadata
  });

export const consumeWallet = (userId: string, amountCents: number, metadata?: Json) =>
  performWalletTransaction({
    userId,
    amountCents,
    type: "consume",
    isCredit: false,
    metadata
  });
