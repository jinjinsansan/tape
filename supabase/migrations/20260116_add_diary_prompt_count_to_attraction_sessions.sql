begin;

alter table if exists public.michelle_attraction_sessions
  add column if not exists diary_prompt_count integer not null default 0;

comment on column public.michelle_attraction_sessions.diary_prompt_count is 'Number of assistant responses used for diary CTA cadence.';

commit;
