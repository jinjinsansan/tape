begin;

create or replace function public.admin_point_totals()
returns table (
  total_topup_cents bigint,
  total_consume_cents bigint,
  total_bonus_cents bigint,
  total_refund_cents bigint,
  total_points_awarded bigint,
  total_points_redeemed bigint
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(sum(amount_cents) filter (where type = 'topup'), 0)::bigint as total_topup_cents,
    coalesce(sum(amount_cents) filter (where type = 'consume'), 0)::bigint as total_consume_cents,
    coalesce(sum(amount_cents) filter (where type = 'bonus'), 0)::bigint as total_bonus_cents,
    coalesce(sum(amount_cents) filter (where type = 'refund'), 0)::bigint as total_refund_cents,
    (select coalesce(sum(points), 0)::bigint from public.point_events) as total_points_awarded,
    (select coalesce(sum(points_spent), 0)::bigint from public.point_redemptions) as total_points_redeemed
  from public.transactions;
$$;

grant execute on function public.admin_point_totals() to authenticated;

create or replace function public.admin_point_action_breakdown()
returns table (
  action public.point_action,
  total_points bigint,
  event_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    action,
    coalesce(sum(points), 0)::bigint as total_points,
    count(*)::bigint as event_count
  from public.point_events
  group by action;
$$;

grant execute on function public.admin_point_action_breakdown() to authenticated;

create or replace function public.admin_point_redemption_breakdown()
returns table (
  reward_title text,
  total_points_spent bigint,
  redemption_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(r.title, '不明') as reward_title,
    coalesce(sum(pr.points_spent), 0)::bigint as total_points_spent,
    count(*)::bigint as redemption_count
  from public.point_redemptions pr
  left join public.point_rewards r on r.id = pr.reward_id
  group by reward_title;
$$;

grant execute on function public.admin_point_redemption_breakdown() to authenticated;

commit;
