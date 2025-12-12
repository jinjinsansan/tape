begin;

-- Extend transaction_type enum with bonus/reward for point operations
do $$
begin
  if not exists (
    select 1 from pg_enum
    join pg_type on pg_enum.enumtypid = pg_type.oid
    where pg_type.typname = 'transaction_type' and enumlabel = 'bonus'
  ) then
    alter type public.transaction_type add value 'bonus';
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_enum
    join pg_type on pg_enum.enumtypid = pg_type.oid
    where pg_type.typname = 'transaction_type' and enumlabel = 'reward'
  ) then
    alter type public.transaction_type add value 'reward';
  end if;
end$$;

-- Point action enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'point_action') then
    create type public.point_action as enum (
      'diary_post',
      'feed_comment',
      'feed_share_x',
      'referral_5days',
      'referral_10days',
      'admin_adjustment'
    );
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'point_redemption_status') then
    create type public.point_redemption_status as enum ('pending', 'approved', 'fulfilled', 'cancelled');
  end if;
end$$;

-- Profiles referral metadata
alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references auth.users(id);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'profiles_referral_code_key'
      and table_name = 'profiles'
  ) then
    alter table public.profiles
      add constraint profiles_referral_code_key unique (referral_code);
  end if;
end$$;

update public.profiles
set referral_code = 'ref-' || encode(gen_random_bytes(5), 'hex')
where referral_code is null;

alter table public.profiles
  alter column referral_code set default 'ref-' || encode(gen_random_bytes(5), 'hex'),
  alter column referral_code set not null;

-- Point award rules master
create table if not exists public.point_award_rules (
  action public.point_action primary key,
  points integer not null,
  description text,
  is_active boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.point_award_rules(action, points, description)
values
  ('diary_post', 3, 'かんじょうにっき投稿'),
  ('feed_comment', 2, 'みんなの日記コメント'),
  ('feed_share_x', 5, 'Xへのシェア'),
  ('referral_5days', 10, '紹介した友達が5日連続投稿'),
  ('referral_10days', 20, '紹介した友達が10日投稿'),
  ('admin_adjustment', 0, '管理者調整')
on conflict (action) do nothing;

create table if not exists public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action public.point_action not null,
  points integer not null,
  wallet_transaction_id uuid references public.transactions(id) on delete set null,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists point_events_user_created_idx on public.point_events(user_id, created_at desc);

create table if not exists public.point_rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  cost_points integer not null,
  stock integer,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.point_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.point_rewards(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  points_spent integer not null,
  quantity integer not null default 1,
  status public.point_redemption_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists point_redemptions_user_idx on public.point_redemptions(user_id, created_at desc);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null references public.profiles(referral_code) on delete cascade,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_user_id uuid unique references auth.users(id) on delete cascade,
  invitee_joined_at timestamptz,
  invitee_day_count integer not null default 0,
  reward_5day_awarded boolean not null default false,
  reward_10day_awarded boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists referrals_code_invitee_key on public.referrals(referral_code, invitee_user_id);

create table if not exists public.referral_diary_days (
  referral_id uuid not null references public.referrals(id) on delete cascade,
  journal_date date not null,
  created_at timestamptz not null default now(),
  primary key (referral_id, journal_date)
);

create trigger set_timestamp_point_rewards
before update on public.point_rewards
for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_point_redemptions
before update on public.point_redemptions
for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_point_award_rules
before update on public.point_award_rules
for each row execute function public.trigger_set_timestamp();

create or replace function public.award_points(
  p_user_id uuid,
  p_action public.point_action,
  p_reference_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.point_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.point_award_rules;
  v_points integer;
  v_tx public.transactions;
  v_event public.point_events;
begin
  select * into v_rule from public.point_award_rules where action = p_action;
  if not found or v_rule.is_active = false then
    return null;
  end if;

  v_points := v_rule.points;
  if v_points <= 0 then
    return null;
  end if;

  v_tx := public.perform_wallet_transaction(
    p_user_id,
    v_points * 100,
    true,
    'bonus',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('action', p_action, 'reference_id', p_reference_id)
  );

  insert into public.point_events(user_id, action, points, wallet_transaction_id, reference_id, metadata)
  values (p_user_id, p_action, v_points, v_tx.id, p_reference_id, coalesce(p_metadata, '{}'::jsonb))
  returning * into v_event;

  return v_event;
end;
$$;

create or replace function public.redeem_points(
  p_user_id uuid,
  p_reward_id uuid,
  p_quantity integer default 1,
  p_metadata jsonb default '{}'::jsonb
)
returns public.point_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward public.point_rewards;
  v_total_cost integer;
  v_tx public.transactions;
  v_redemption public.point_redemptions;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select * into v_reward from public.point_rewards where id = p_reward_id for update;
  if not found or v_reward.is_active = false then
    raise exception 'REWARD_NOT_AVAILABLE';
  end if;

  if v_reward.stock is not null and v_reward.stock < p_quantity then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  v_total_cost := v_reward.cost_points * p_quantity;

  v_tx := public.perform_wallet_transaction(
    p_user_id,
    v_total_cost * 100,
    false,
    'reward',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('reward_id', p_reward_id)
  );

  if v_reward.stock is not null then
    update public.point_rewards
    set stock = stock - p_quantity,
        updated_at = now()
    where id = v_reward.id;
  end if;

  insert into public.point_redemptions(reward_id, user_id, points_spent, quantity, metadata)
  values (p_reward_id, p_user_id, v_total_cost, p_quantity, coalesce(p_metadata, '{}'::jsonb))
  returning * into v_redemption;

  return v_redemption;
end;
$$;

create or replace function public.record_referral_diary_day(p_invitee_user_id uuid, p_journal_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.referrals;
  v_count integer;
begin
  select * into v_referral from public.referrals where invitee_user_id = p_invitee_user_id;
  if not found then
    return;
  end if;

  begin
    insert into public.referral_diary_days(referral_id, journal_date)
    values (v_referral.id, p_journal_date)
    on conflict do nothing;
  exception when unique_violation then
    -- already counted for this day
    return;
  end;

  select count(*) into v_count from public.referral_diary_days where referral_id = v_referral.id;

  update public.referrals
  set invitee_day_count = v_count
  where id = v_referral.id;

  if v_count >= 5 and v_referral.reward_5day_awarded = false then
    perform public.award_points(v_referral.referrer_user_id, 'referral_5days', v_referral.invitee_user_id::text, jsonb_build_object('threshold', 5));
    update public.referrals set reward_5day_awarded = true where id = v_referral.id;
  end if;

  if v_count >= 10 and v_referral.reward_10day_awarded = false then
    perform public.award_points(v_referral.referrer_user_id, 'referral_10days', v_referral.invitee_user_id::text, jsonb_build_object('threshold', 10));
    update public.referrals set reward_10day_awarded = true where id = v_referral.id;
  end if;
end;
$$;

alter table public.point_award_rules enable row level security;
alter table public.point_events enable row level security;
alter table public.point_rewards enable row level security;
alter table public.point_redemptions enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_diary_days enable row level security;

create policy "Point events visible for owner"
on public.point_events
for select
using (auth.uid() = user_id);

create policy "Point rewards visible when active"
on public.point_rewards
for select
using (is_active = true);

create policy "Point redemptions visible for owner"
on public.point_redemptions
for select
using (auth.uid() = user_id);

create policy "Referral records visible to invitee"
on public.referrals
for select
using (auth.uid() = invitee_user_id or auth.uid() = referrer_user_id);

create policy "Referral diary days hidden"
on public.referral_diary_days
for select
using (false);

commit;
