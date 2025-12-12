begin;

-- point_redemptionsテーブルとprofilesテーブルのリレーションシップ問題の解決
-- 
-- 問題: point_redemptions.user_id は auth.users(id) を参照しているが、
--       Supabaseのクエリビルダーがprofilesテーブルとのリレーションシップを認識できない
--
-- 解決策: 管理者用のビューを作成して、JOINを事前に実行

drop view if exists public.admin_point_redemptions_view;

create view public.admin_point_redemptions_view as
select 
  pr.id,
  pr.reward_id,
  pr.user_id,
  pr.points_spent,
  pr.quantity,
  pr.status,
  pr.metadata,
  pr.created_at,
  pr.updated_at,
  -- reward情報
  row_to_json(rew.*) as reward,
  -- user情報
  jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name
  ) as user
from public.point_redemptions pr
left join public.point_rewards rew on rew.id = pr.reward_id
left join public.profiles p on p.id = pr.user_id
order by pr.created_at desc;

-- RLS有効化
alter view public.admin_point_redemptions_view set (security_invoker = on);

-- 管理者のみアクセス可能なポリシー（ビューはRLSをサポートしないため、関数側で制御）
grant select on public.admin_point_redemptions_view to authenticated;

comment on view public.admin_point_redemptions_view is 
'管理者用のポイント交換履歴ビュー。profilesテーブルとのJOINを含む。';

commit;
