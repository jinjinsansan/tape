begin;

-- =====================================
-- Xアカウント登録とシェア追跡システム
-- =====================================

-- profiles テーブルに Twitter アカウント情報を追加
alter table public.profiles
add column if not exists twitter_username text,
add column if not exists twitter_username_updated_at timestamptz;

-- Twitter ユーザー名のバリデーション制約
alter table public.profiles
add constraint twitter_username_format
check (
  twitter_username is null or
  (twitter_username ~ '^[A-Za-z0-9_]{1,15}$')
);

-- Twitter ユーザー名のユニーク制約（NULL許容）
create unique index if not exists profiles_twitter_username_key
on public.profiles (twitter_username)
where twitter_username is not null;

-- シェアログテーブル作成
create table if not exists public.feed_share_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.emotion_diary_entries(id) on delete cascade,
  platform text not null check (platform in ('copy', 'x', 'line')),
  twitter_username text,
  shared_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

-- インデックス作成
create index if not exists feed_share_log_user_id_idx on public.feed_share_log(user_id);
create index if not exists feed_share_log_entry_id_idx on public.feed_share_log(entry_id);
create index if not exists feed_share_log_shared_at_idx on public.feed_share_log(shared_at desc);
create index if not exists feed_share_log_platform_idx on public.feed_share_log(platform);

-- RLS有効化
alter table public.feed_share_log enable row level security;

-- ユーザーは自分のシェアログのみ閲覧可能
create policy "Users can view their own share log"
on public.feed_share_log
for select
using (auth.uid() = user_id);

-- 管理者は全てのシェアログを閲覧可能
create policy "Admins can view all share logs"
on public.feed_share_log
for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- シェアログ挿入は認証済みユーザーのみ
create policy "Authenticated users can insert share log"
on public.feed_share_log
for insert
with check (auth.uid() = user_id);

-- 管理者用ビュー：ユーザーごとのシェア統計
create or replace view public.admin_user_share_stats as
select
  p.id as user_id,
  p.display_name,
  p.twitter_username,
  p.twitter_username_updated_at,
  count(fsl.id) filter (where fsl.platform = 'x') as x_share_count,
  count(fsl.id) filter (where fsl.platform = 'copy') as copy_share_count,
  count(fsl.id) filter (where fsl.platform = 'line') as line_share_count,
  count(fsl.id) as total_share_count,
  max(fsl.shared_at) filter (where fsl.platform = 'x') as last_x_share_at,
  count(distinct fsl.shared_at::date) filter (where fsl.platform = 'x') as x_share_days
from public.profiles p
left join public.feed_share_log fsl on fsl.user_id = p.id
group by p.id, p.display_name, p.twitter_username, p.twitter_username_updated_at;

-- 管理者のみビューにアクセス可能
grant select on public.admin_user_share_stats to authenticated;

create policy "Admins can view share stats"
on public.admin_user_share_stats
for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- コメント
comment on column public.profiles.twitter_username is 'Xアカウントのユーザー名（@なし、英数字とアンダースコアのみ、最大15文字）';
comment on column public.profiles.twitter_username_updated_at is 'Xアカウント最終更新日時（7日間変更不可）';
comment on table public.feed_share_log is 'フィードシェアログ（不正防止のための追跡）';

commit;
