begin;

alter table public.emotion_diary_entries
  add column if not exists emotion_label text,
  add column if not exists event_summary text,
  add column if not exists realization text,
  add column if not exists self_esteem_score smallint check (self_esteem_score between 0 and 100),
  add column if not exists worthlessness_score smallint check (worthlessness_score between 0 and 100);

create table if not exists public.diary_initial_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  self_esteem_score smallint not null check (self_esteem_score between 0 and 100),
  worthlessness_score smallint not null check (worthlessness_score between 0 and 100),
  measured_on date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint diary_initial_scores_unique_user unique (user_id)
);

create trigger set_timestamp_diary_initial_scores
  before update on public.diary_initial_scores
  for each row execute function public.trigger_set_timestamp();

alter table public.diary_initial_scores enable row level security;

create policy diary_initial_scores_select_own
  on public.diary_initial_scores
  for select using (auth.uid() = user_id);

create policy diary_initial_scores_modify_own
  on public.diary_initial_scores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.diary_initial_scores to authenticated;

commit;
