-- このSQLをSupabase Dashboardの SQL Editor から実行してください
-- https://ozbajojjxylawffploch.supabase.co のダッシュボードにアクセス
-- SQL Editor > New Query で以下を実行

begin;

-- goldbenchan@gmail.com に管理者権限を付与
with target_user as (
  select
    id,
    coalesce(nullif(raw_user_meta_data->>'full_name', ''), email) as display_name
  from auth.users
  where email = 'goldbenchan@gmail.com'
)
insert into public.profiles (id, display_name, role)
select id, display_name, 'admin'
from target_user
on conflict (id) do update set role = excluded.role;

commit;

-- 確認用クエリ: 実行後に以下のクエリで権限が正しく設定されているか確認
-- SELECT p.id, p.display_name, p.role, u.email 
-- FROM public.profiles p 
-- JOIN auth.users u ON u.id = p.id 
-- WHERE u.email = 'goldbenchan@gmail.com';
