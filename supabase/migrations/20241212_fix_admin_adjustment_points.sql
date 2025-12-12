begin;

-- =====================================
-- award_points 関数の修正
-- admin_adjustment の場合は metadata からポイント数を取得
-- =====================================

create or replace function public.award_points(
  p_user_id uuid,
  p_action public.point_action,
  p_reference_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.point_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.point_award_rules;
  v_points integer;
  v_tx public.transactions;
  v_event public.point_events;
begin
  -- ルールを取得
  select * into v_rule from public.point_award_rules where action = p_action;
  if not found then
    raise exception 'INVALID_ACTION';
  end if;

  -- ルールが無効の場合はエラー
  if v_rule.is_active = false then
    raise exception 'ACTION_DISABLED';
  end if;

  -- admin_adjustment の場合は metadata からポイント数を取得
  -- それ以外の場合はルールテーブルから取得
  if p_action = 'admin_adjustment' then
    if p_metadata ? 'points' then
      v_points := (p_metadata->>'points')::integer;
    else
      raise exception 'ADMIN_ADJUSTMENT_MISSING_POINTS';
    end if;
  else
    v_points := v_rule.points;
  end if;

  -- ポイントが0以下の場合はエラー
  if v_points <= 0 then
    raise exception 'INVALID_POINTS';
  end if;

  -- 重複チェック（admin_adjustment以外）
  if p_action != 'admin_adjustment' and p_reference_id is not null then
    if exists (
      select 1 from public.point_events
      where user_id = p_user_id and action = p_action and reference_id = p_reference_id
    ) then
      raise exception 'DUPLICATE_POINT_EVENT';
    end if;
  end if;

  -- ウォレットに残高を追加（ポイント × 100 = セント）
  v_tx := public.perform_wallet_transaction(
    p_user_id,
    v_points * 100,
    true,
    'bonus',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('action', p_action, 'reference_id', p_reference_id)
  );

  -- ポイントイベントを記録
  insert into public.point_events(user_id, action, points, wallet_transaction_id, reference_id, metadata)
  values (p_user_id, p_action, v_points, v_tx.id, p_reference_id, coalesce(p_metadata, '{}'::jsonb))
  returning * into v_event;

  return v_event;
end;
$$;

commit;
