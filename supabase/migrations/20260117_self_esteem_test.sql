create table if not exists public.self_esteem_test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  test_date date not null,
  question_ids text[] not null,
  answers jsonb not null,
  self_esteem_score smallint not null check (self_esteem_score between 0 and 100),
  worthlessness_score smallint not null check (worthlessness_score between 0 and 100),
  is_posted_to_diary boolean not null default false,
  diary_entry_id uuid references public.emotion_diary_entries (id) on delete set null,
  completed_at timestamptz default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists self_esteem_test_results_user_date_idx
  on public.self_esteem_test_results (user_id, test_date);

create index if not exists self_esteem_test_results_user_created_idx
  on public.self_esteem_test_results (user_id, created_at desc);

create trigger set_timestamp_self_esteem_test_results
  before update on public.self_esteem_test_results
  for each row execute function public.trigger_set_timestamp();

alter table public.self_esteem_test_results enable row level security;

create policy "Users can read their self esteem results"
  on public.self_esteem_test_results for select
  using (auth.uid() = user_id);

create policy "Users can insert their self esteem results"
  on public.self_esteem_test_results for insert
  with check (auth.uid() = user_id);

create policy "Users can update their self esteem results"
  on public.self_esteem_test_results for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.self_esteem_question_history (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  shown_date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists self_esteem_question_history_unique
  on public.self_esteem_question_history (user_id, question_id, shown_date);

alter table public.self_esteem_question_history enable row level security;

create policy "Users can read their question history"
  on public.self_esteem_question_history for select
  using (auth.uid() = user_id);

create policy "Users can insert their question history"
  on public.self_esteem_question_history for insert
  with check (auth.uid() = user_id);
