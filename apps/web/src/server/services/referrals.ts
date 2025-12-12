import type { Database } from "@tape/supabase";

import { getSupabaseAdminClient } from "@/server/supabase";

type ReferralRow = Database["public"]["Tables"]["referrals"]["Row"];

const admin = () => getSupabaseAdminClient();

export const getReferralSummary = async (userId: string) => {
  const supabase = admin();

  const [{ data: profile, error: profileError }] = await Promise.all([
    supabase.from("profiles").select("referral_code, referred_by, display_name").eq("id", userId).maybeSingle()
  ]);

  if (profileError) {
    throw profileError;
  }

  const [invitesRes, asInviteeRes, referredByProfile] = await Promise.all([
    supabase
      .from("referrals")
      .select(
        "id, referral_code, referrer_user_id, invitee_user_id, invitee_joined_at, invitee_day_count, reward_5day_awarded, reward_10day_awarded, created_at"
      )
      .eq("referrer_user_id", userId),
    supabase
      .from("referrals")
      .select("id, referrer_user_id, invitee_day_count, reward_5day_awarded, reward_10day_awarded, invitee_joined_at")
      .eq("invitee_user_id", userId)
      .maybeSingle(),
    profile?.referred_by
      ? supabase
          .from("profiles")
          .select("id, display_name, referral_code")
          .eq("id", profile.referred_by)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  if (invitesRes.error) {
    throw invitesRes.error;
  }

  if (asInviteeRes.error) {
    throw asInviteeRes.error;
  }

  if (referredByProfile.error) {
    throw referredByProfile.error;
  }

  const invites = invitesRes.data ?? [];
  const inviteeProfilesMap = new Map<string, string | null>();
  const inviteeIds = invites
    .map((invite) => invite.invitee_user_id)
    .filter((id): id is string => Boolean(id));

  if (inviteeIds.length > 0) {
    const { data: inviteeProfiles, error: inviteeProfilesError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", inviteeIds);
    if (inviteeProfilesError) {
      throw inviteeProfilesError;
    }
    (inviteeProfiles ?? []).forEach((profileRow) => {
      inviteeProfilesMap.set(profileRow.id, profileRow.display_name);
    });
  }

  return {
    referralCode: profile?.referral_code ?? null,
    referredBy: referredByProfile.data
      ? {
          id: referredByProfile.data.id,
          displayName: referredByProfile.data.display_name,
          referralCode: referredByProfile.data.referral_code
        }
      : null,
    invites: invites.map((invite) => ({
      id: invite.id,
      inviteeUserId: invite.invitee_user_id,
      inviteeName: invite.invitee_user_id ? inviteeProfilesMap.get(invite.invitee_user_id) ?? "参加者" : "参加者",
      dayCount: invite.invitee_day_count,
      joinedAt: invite.invitee_joined_at,
      reward5Granted: invite.reward_5day_awarded,
      reward10Granted: invite.reward_10day_awarded
    })),
    inviteeProgress: asInviteeRes.data
      ? {
          referrer: referredByProfile.data
            ? {
                id: referredByProfile.data.id,
                displayName: referredByProfile.data.display_name,
                referralCode: referredByProfile.data.referral_code
              }
            : null,
          dayCount: asInviteeRes.data.invitee_day_count,
          reward5Granted: asInviteeRes.data.reward_5day_awarded,
          reward10Granted: asInviteeRes.data.reward_10day_awarded
        }
      : null
  };
};

export const claimReferralCode = async (userId: string, code: string) => {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error("招待コードを入力してください");
  }

  const supabase = admin();

  const { data: owner, error: ownerError } = await supabase
    .from("profiles")
    .select("id, referral_code")
    .eq("referral_code", trimmed)
    .maybeSingle();

  if (ownerError) {
    throw ownerError;
  }

  if (!owner) {
    throw new Error("招待コードが見つかりませんでした");
  }

  if (owner.id === userId) {
    throw new Error("自分のコードは利用できません");
  }

  const { data: userProfile } = await supabase
    .from("profiles")
    .select("referred_by")
    .eq("id", userId)
    .maybeSingle();

  if (userProfile?.referred_by) {
    throw new Error("既に招待コードを利用済みです");
  }

  const { data: existing } = await supabase
    .from("referrals")
    .select("id")
    .eq("invitee_user_id", userId)
    .maybeSingle();

  if (existing) {
    return existing as ReferralRow;
  }

  const insertPayload = {
    referral_code: owner.referral_code,
    referrer_user_id: owner.id,
    invitee_user_id: userId,
    invitee_joined_at: new Date().toISOString()
  } satisfies Partial<ReferralRow>;

  const { data: referral, error: insertError } = await supabase
    .from("referrals")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  await supabase.from("profiles").update({ referred_by: owner.id }).eq("id", userId);

  return referral as ReferralRow;
};

export const recordReferralDiaryDay = async (userId: string, journalDate: string) => {
  const supabase = admin();
  await supabase.rpc("record_referral_diary_day", {
    p_invitee_user_id: userId,
    p_journal_date: journalDate
  });
};
