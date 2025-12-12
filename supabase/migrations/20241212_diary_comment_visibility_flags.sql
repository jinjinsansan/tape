begin;

alter table public.emotion_diary_entries
  add column if not exists is_ai_comment_public boolean not null default false;

alter table public.emotion_diary_entries
  add column if not exists is_counselor_comment_public boolean not null default false;

commit;
