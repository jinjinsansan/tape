-- Telegram Bot sessions & messages
begin;

create table if not exists public.telegram_bot_sessions (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id text not null unique,
  display_name text,
  message_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists telegram_bot_sessions_chat_idx
  on public.telegram_bot_sessions(telegram_chat_id);

create trigger set_timestamp_telegram_bot_sessions
  before update on public.telegram_bot_sessions
  for each row execute function public.trigger_set_timestamp();

create table if not exists public.telegram_bot_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.telegram_bot_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists telegram_bot_messages_session_idx
  on public.telegram_bot_messages(session_id, created_at desc);

-- RLS: service_role only (bot runs server-side)
alter table public.telegram_bot_sessions enable row level security;
alter table public.telegram_bot_messages enable row level security;

create policy telegram_bot_sessions_service_role
  on public.telegram_bot_sessions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy telegram_bot_messages_service_role
  on public.telegram_bot_messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
