-- Extend diary AI comment status enum
alter type public.diary_ai_comment_status
  add value if not exists 'skipped';

-- Admin settings key/value table
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Default delay setting (10 minutes)
insert into public.admin_settings (key, value)
values ('diary_ai_comment_delay', jsonb_build_object('minutes', 10))
on conflict (key) do nothing;

-- Jobs table to track pending AI comments
create table if not exists public.diary_ai_comment_jobs (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.emotion_diary_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'processing', 'completed', 'failed', 'skipped')),
  scheduled_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diary_ai_comment_jobs_status_idx
  on public.diary_ai_comment_jobs (status, scheduled_at);

create index if not exists diary_ai_comment_jobs_entry_idx
  on public.diary_ai_comment_jobs (entry_id);

alter table public.diary_ai_comment_jobs enable row level security;

-- Store generated AI comments on entries
alter table public.emotion_diary_entries
  add column if not exists ai_comment text,
  add column if not exists ai_comment_generated_at timestamptz,
  add column if not exists ai_comment_metadata jsonb not null default '{}'::jsonb;
