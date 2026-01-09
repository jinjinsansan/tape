create or replace view public.admin_counselor_booking_summary as
select
  count(*)::bigint as total_bookings,
  count(*) filter (where status = 'pending')::bigint as pending_bookings,
  count(*) filter (where status = 'confirmed')::bigint as confirmed_bookings,
  count(*) filter (where status = 'completed')::bigint as completed_bookings,
  count(*) filter (where status = 'cancelled')::bigint as cancelled_bookings,
  count(*) filter (where payment_status = 'paid')::bigint as paid_bookings,
  coalesce(sum(price_cents) filter (where payment_status = 'paid'), 0)::bigint as total_revenue_cents
from public.counselor_bookings;

create or replace view public.admin_counselor_booking_monthly as
select
  date_trunc('month', created_at)::date as month,
  coalesce(sum(price_cents) filter (where payment_status = 'paid'), 0)::bigint as revenue_cents,
  count(*)::bigint as booking_count
from public.counselor_bookings
group by 1
order by 1 desc
limit 12;

grant select on public.admin_counselor_booking_summary to authenticated;
grant select on public.admin_counselor_booking_monthly to authenticated;
