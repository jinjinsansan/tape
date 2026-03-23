-- ユーザーメモリテーブル: ミシェルがユーザーごとに覚えておく長期記憶
create table public.telegram_bot_user_memories (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.telegram_bot_sessions(id) on delete cascade,
  category text not null check (category in ('profile', 'emotion_pattern', 'duct_tape', 'insight', 'context')),
  content text not null,
  importance integer not null default 5 check (importance between 1 and 10),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- インデックス
create index telegram_bot_memories_recent_idx
  on public.telegram_bot_user_memories (session_id, created_at desc);

create index telegram_bot_memories_importance_idx
  on public.telegram_bot_user_memories (session_id, importance desc);

-- 自動updated_atトリガー
create trigger set_timestamp_telegram_bot_memories
  before update on public.telegram_bot_user_memories
  for each row execute function public.trigger_set_timestamp();

-- RLS (service_roleのみ)
alter table public.telegram_bot_user_memories enable row level security;

create policy telegram_bot_memories_service_role
  on public.telegram_bot_user_memories for all
  to service_role using (true) with check (true);
