begin;

create extension if not exists "pgcrypto" with schema public;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'wallet_status') then
    create type public.wallet_status as enum ('active', 'locked');
  end if;
  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type public.transaction_type as enum ('topup', 'consume', 'refund', 'hold', 'release');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_channel') then
    create type public.notification_channel as enum ('in_app', 'email', 'push');
  end if;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'member',
  onboarding_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  balance_cents bigint not null default 0,
  currency text not null default 'JPY',
  status public.wallet_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallets_user_unique unique (user_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.transaction_type not null,
  amount_cents bigint not null,
  balance_after_cents bigint not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel public.notification_channel not null default 'in_app',
  type text not null,
  title text,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel public.notification_channel not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, channel)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.trigger_set_timestamp()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger set_timestamp_profiles
before update on public.profiles
for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_wallets
before update on public.wallets
for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_notification_preferences
before update on public.notification_preferences
for each row execute function public.trigger_set_timestamp();

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel public.notification_channel not null,
  external_reference text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create or replace function public.perform_wallet_transaction(
  p_user_id uuid,
  p_amount_cents bigint,
  p_is_credit boolean,
  p_type public.transaction_type,
  p_metadata jsonb default '{}'::jsonb
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
  v_delta bigint;
  v_new_balance bigint;
  v_tx public.transactions;
begin
  select * into v_wallet from public.wallets where user_id = p_user_id for update;
  if not found then
    insert into public.wallets(user_id)
    values (p_user_id)
    returning * into v_wallet;
  end if;

  v_delta := case when p_is_credit then p_amount_cents else -1 * p_amount_cents end;
  v_new_balance := v_wallet.balance_cents + v_delta;

  if v_new_balance < 0 then
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  update public.wallets
    set balance_cents = v_new_balance,
        updated_at = now()
  where id = v_wallet.id;

  insert into public.transactions(wallet_id, user_id, type, amount_cents, balance_after_cents, metadata)
  values (v_wallet.id, p_user_id, p_type, v_delta, v_new_balance, coalesce(p_metadata, '{}'::jsonb))
  returning * into v_tx;

  return v_tx;
end;
$$;

create or replace function public.enqueue_notification(
  p_user_id uuid,
  p_channel public.notification_channel,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification public.notifications;
begin
  insert into public.notifications(user_id, channel, type, title, body, data)
  values (p_user_id, p_channel, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb))
  returning * into v_notification;
  return v_notification;
end;
$$;

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

create policy "Users can view their profile"
on public.profiles
for select using (auth.uid() = id);

create policy "Users can update their profile"
on public.profiles
for update using (auth.uid() = id);

create policy "Users can view their wallet"
on public.wallets
for select using (auth.uid() = user_id);

create policy "Users cannot insert wallets manually"
on public.wallets
for insert with check (false);

create policy "Users cannot update wallets manually"
on public.wallets
for update using (false);

create policy "Users can view their transactions"
on public.transactions
for select using (auth.uid() = user_id);

create policy "Users can view their notifications"
on public.notifications
for select using (auth.uid() = user_id);

create policy "Users can update notification read state"
on public.notifications
for update using (auth.uid() = user_id);

create policy "Users can manage notification preferences"
on public.notification_preferences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update on public.notifications to authenticated;

commit;
