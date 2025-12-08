begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'diary_visibility') then
    create type diary_visibility as enum ('private', 'followers', 'public');
  end if;

  if not exists (select 1 from pg_type where typname = 'diary_comment_source') then
    create type diary_comment_source as enum ('user', 'ai', 'counselor', 'moderator');
  end if;

  if not exists (select 1 from pg_type where typname = 'diary_reaction_type') then
    create type diary_reaction_type as enum ('cheer', 'hug', 'empathy', 'insight');
  end if;

  if not exists (select 1 from pg_type where typname = 'diary_ai_comment_status') then
    create type diary_ai_comment_status as enum ('idle', 'pending', 'processing', 'completed', 'failed');
  end if;
end;
$$;

create table if not exists public.emotion_diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null,
  mood_score smallint check (mood_score between 1 and 5),
  mood_label text,
  mood_color text,
  energy_level smallint check (energy_level between 1 and 5),
  visibility diary_visibility not null default 'private',
  ai_comment_status diary_ai_comment_status not null default 'idle',
  ai_summary text,
  ai_highlights jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  journal_date date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint diary_visibility_published_check
    check ((visibility = 'public' and published_at is not null) or visibility <> 'public')
);

create index if not exists emotion_diary_entries_user_idx
  on public.emotion_diary_entries (user_id, journal_date desc);

create index if not exists emotion_diary_entries_public_idx
  on public.emotion_diary_entries (visibility, published_at desc)
  where visibility = 'public';

create table if not exists public.emotion_diary_entry_feelings (
  entry_id uuid not null references public.emotion_diary_entries(id) on delete cascade,
  label text not null,
  intensity smallint not null default 50 check (intensity between 0 and 100),
  tone text,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (entry_id, label)
);

create table if not exists public.emotion_diary_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.emotion_diary_entries(id) on delete cascade,
  commenter_user_id uuid references auth.users(id) on delete set null,
  source diary_comment_source not null default 'user',
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.emotion_diary_reactions (
  entry_id uuid not null references public.emotion_diary_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type diary_reaction_type not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (entry_id, user_id, reaction_type)
);

create index if not exists emotion_diary_reactions_entry_idx
  on public.emotion_diary_reactions (entry_id);

create trigger set_timestamp_emotion_diary_entries
  before update on public.emotion_diary_entries
  for each row execute function public.trigger_set_timestamp();

alter table public.emotion_diary_entries enable row level security;
alter table public.emotion_diary_entry_feelings enable row level security;
alter table public.emotion_diary_comments enable row level security;
alter table public.emotion_diary_reactions enable row level security;

create policy diary_entries_select_own
  on public.emotion_diary_entries
  for select using (auth.uid() = user_id);

create policy diary_entries_select_public
  on public.emotion_diary_entries
  for select using (visibility = 'public');

create policy diary_entries_insert_own
  on public.emotion_diary_entries
  for insert with check (auth.uid() = user_id);

create policy diary_entries_update_own
  on public.emotion_diary_entries
  for update using (auth.uid() = user_id);

create policy diary_entries_delete_own
  on public.emotion_diary_entries
  for delete using (auth.uid() = user_id);

create policy diary_feelings_access
  on public.emotion_diary_entry_feelings
  for select using (
    exists (
      select 1 from public.emotion_diary_entries e
      where e.id = emotion_diary_entry_feelings.entry_id
        and (auth.uid() = e.user_id or e.visibility = 'public')
    )
  );

create policy diary_feelings_mutate_own
  on public.emotion_diary_entry_feelings
  for all using (
    exists (
      select 1 from public.emotion_diary_entries e
      where e.id = emotion_diary_entry_feelings.entry_id
        and auth.uid() = e.user_id
    )
  ) with check (
    exists (
      select 1 from public.emotion_diary_entries e
      where e.id = emotion_diary_entry_feelings.entry_id
        and auth.uid() = e.user_id
    )
  );

create policy diary_comments_select
  on public.emotion_diary_comments
  for select using (
    exists (
      select 1 from public.emotion_diary_entries e
      where e.id = emotion_diary_comments.entry_id
        and (
          auth.uid() = e.user_id
          or e.visibility = 'public'
          or (emotion_diary_comments.commenter_user_id is not null and auth.uid() = emotion_diary_comments.commenter_user_id)
        )
    )
  );

create policy diary_comments_insert_owner_or_author
  on public.emotion_diary_comments
  for insert with check (
    exists (
      select 1 from public.emotion_diary_entries e
      where e.id = emotion_diary_comments.entry_id
        and auth.uid() = e.user_id
    )
    or (emotion_diary_comments.commenter_user_id is not null and auth.uid() = emotion_diary_comments.commenter_user_id)
  );

create policy diary_reactions_select
  on public.emotion_diary_reactions
  for select using (
    exists (
      select 1 from public.emotion_diary_entries e
      where e.id = emotion_diary_reactions.entry_id
        and (auth.uid() = e.user_id or e.visibility = 'public' or auth.uid() = emotion_diary_reactions.user_id)
    )
  );

create policy diary_reactions_mutate_own
  on public.emotion_diary_reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.emotion_diary_entries to authenticated;
grant select, insert, update, delete on public.emotion_diary_entry_feelings to authenticated;
grant select, insert on public.emotion_diary_comments to authenticated;
grant select, insert, delete on public.emotion_diary_reactions to authenticated;

commit;
