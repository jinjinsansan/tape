alter table public.mind_trees
  add column if not exists color_cycle_index integer not null default 0;
