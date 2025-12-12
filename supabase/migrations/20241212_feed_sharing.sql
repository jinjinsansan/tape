begin;

alter table public.emotion_diary_entries
  add column if not exists is_shareable boolean not null default true,
  add column if not exists share_count integer not null default 0;

create index if not exists emotion_diary_entries_shareable_idx
  on public.emotion_diary_entries (visibility, is_shareable)
  where visibility = 'public';

create or replace function public.increment_diary_share_count(target_entry_id uuid)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  update public.emotion_diary_entries
  set share_count = share_count + 1
  where id = target_entry_id
    and visibility = 'public'
    and is_shareable = true
    and deleted_at is null
  returning share_count into new_count;

  return new_count;
end;
$$;

commit;
