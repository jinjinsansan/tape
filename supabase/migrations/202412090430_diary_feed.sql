begin;

create table if not exists public.emotion_diary_feed_reactions (
  entry_id uuid not null references public.emotion_diary_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (char_length(reaction_type) <= 32),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (entry_id, user_id)
);

create index if not exists emotion_diary_feed_reactions_entry_idx on public.emotion_diary_feed_reactions(entry_id);

create table if not exists public.emotion_diary_reports (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.emotion_diary_entries(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolution_note text
);

create index if not exists emotion_diary_reports_entry_idx on public.emotion_diary_reports(entry_id);
create index if not exists emotion_diary_reports_status_idx on public.emotion_diary_reports(status);

create table if not exists public.emotion_diary_moderation_log (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.emotion_diary_entries(id) on delete cascade,
  moderator_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace view public.emotion_diary_public_feed as
select
  e.id,
  e.user_id,
  e.title,
  e.content,
  e.mood_score,
  e.mood_label,
  e.mood_color,
  e.energy_level,
  e.ai_summary,
  e.ai_highlights,
  e.published_at,
  e.journal_date,
  e.created_at,
  e.updated_at
from public.emotion_diary_entries e
where e.visibility = 'public'
  and e.deleted_at is null
  and e.published_at is not null;

alter table public.emotion_diary_feed_reactions enable row level security;
alter table public.emotion_diary_reports enable row level security;
alter table public.emotion_diary_moderation_log enable row level security;

create policy diary_feed_reactions_owner
  on public.emotion_diary_feed_reactions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy diary_feed_reports_insert
  on public.emotion_diary_reports
  for insert with check (auth.uid() = reporter_user_id);

grant select, insert, delete on public.emotion_diary_feed_reactions to authenticated;
grant insert on public.emotion_diary_reports to authenticated;

commit;
