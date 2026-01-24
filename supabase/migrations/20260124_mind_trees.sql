begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'mind_tree_stage') then
    create type mind_tree_stage as enum ('seed', 'sprout', 'sapling', 'blooming', 'fruit_bearing', 'guardian');
  end if;

  if not exists (select 1 from pg_type where typname = 'mind_tree_event_type') then
    create type mind_tree_event_type as enum ('growth_stage_up', 'new_branch', 'weather_shift', 'stat_rebuild');
  end if;
end;
$$;

create table if not exists public.mind_trees (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stage mind_tree_stage not null default 'seed',
  growth_points integer not null default 0 check (growth_points >= 0),
  primary_color text not null default '#8b5cf6',
  secondary_color text not null default '#f472b6',
  shape_variant smallint not null default 0 check (shape_variant between 0 and 255),
  leaf_variant smallint not null default 0 check (leaf_variant between 0 and 255),
  background_variant smallint not null default 0 check (background_variant between 0 and 255),
  weather_state text,
  emotion_diversity_score smallint not null default 0 check (emotion_diversity_score between 0 and 1000),
  last_event_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists mind_trees_stage_idx
  on public.mind_trees (stage);

create trigger set_timestamp_mind_trees
  before update on public.mind_trees
  for each row execute function public.trigger_set_timestamp();

create table if not exists public.mind_tree_emotions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  emotion_key text not null,
  entry_count integer not null default 0 check (entry_count >= 0),
  total_intensity integer not null default 0 check (total_intensity >= 0),
  last_entry_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, emotion_key)
);

create index if not exists mind_tree_emotions_user_idx
  on public.mind_tree_emotions (user_id);

create index if not exists mind_tree_emotions_emotion_idx
  on public.mind_tree_emotions (emotion_key);

create trigger set_timestamp_mind_tree_emotions
  before update on public.mind_tree_emotions
  for each row execute function public.trigger_set_timestamp();

create table if not exists public.mind_tree_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type mind_tree_event_type not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists mind_tree_events_user_idx
  on public.mind_tree_events (user_id, created_at desc);

alter table public.mind_trees enable row level security;
alter table public.mind_tree_emotions enable row level security;
alter table public.mind_tree_events enable row level security;

create policy mind_trees_select_own
  on public.mind_trees
  for select using (auth.uid() = user_id);

create policy mind_tree_emotions_select_own
  on public.mind_tree_emotions
  for select using (auth.uid() = user_id);

create policy mind_tree_events_select_own
  on public.mind_tree_events
  for select using (auth.uid() = user_id);

grant select on public.mind_trees to authenticated;
grant select on public.mind_tree_emotions to authenticated;
grant select on public.mind_tree_events to authenticated;

commit;
