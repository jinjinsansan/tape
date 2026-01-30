begin;

alter table public.emotion_diary_comments
  add column if not exists parent_id uuid references public.emotion_diary_comments(id) on delete cascade;

create index if not exists emotion_diary_comments_parent_idx
  on public.emotion_diary_comments(parent_id)
  where parent_id is not null;

create index if not exists emotion_diary_comments_entry_created_idx
  on public.emotion_diary_comments(entry_id, created_at);

commit;
