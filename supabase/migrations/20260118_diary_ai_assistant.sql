begin;

create table if not exists public.diary_ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress',
  current_step text not null default 'event',
  answers jsonb not null default '{}'::jsonb,
  emotion text,
  self_esteem_score smallint,
  worthlessness_score smallint,
  draft jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_timestamp_diary_ai_sessions on public.diary_ai_sessions;
create trigger set_timestamp_diary_ai_sessions
before update on public.diary_ai_sessions
for each row execute function public.trigger_set_timestamp();

create table if not exists public.diary_ai_drafts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.diary_ai_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  payload jsonb not null,
  status text not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.diary_ai_sessions enable row level security;
alter table public.diary_ai_drafts enable row level security;

drop policy if exists "Users manage their diary ai sessions" on public.diary_ai_sessions;
create policy "Users manage their diary ai sessions"
on public.diary_ai_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their diary ai drafts" on public.diary_ai_drafts;
create policy "Users manage their diary ai drafts"
on public.diary_ai_drafts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

commit;
