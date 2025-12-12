begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'diary_assessment_age_path') then
    create type diary_assessment_age_path as enum ('teen', 'adult', 'senior');
  end if;
end;
$$;

create table if not exists public.diary_self_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  age_path diary_assessment_age_path not null,
  self_esteem_score smallint not null check (self_esteem_score between 0 and 100),
  worthlessness_score smallint not null check (worthlessness_score between 0 and 100),
  measured_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists diary_self_assessments_user_idx
  on public.diary_self_assessments (user_id, measured_at desc);

alter table public.diary_self_assessments enable row level security;

create policy diary_self_assessments_select_own
  on public.diary_self_assessments
  for select using (auth.uid() = user_id);

create policy diary_self_assessments_insert_own
  on public.diary_self_assessments
  for insert with check (auth.uid() = user_id);

create policy diary_self_assessments_delete_own
  on public.diary_self_assessments
  for delete using (auth.uid() = user_id);

grant select, insert, delete on public.diary_self_assessments to authenticated;

commit;
