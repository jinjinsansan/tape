-- Deduplicate existing pending bookings per counselor/client pair
with ranked as (
  select
    id,
    row_number() over (partition by counselor_id, client_user_id order by created_at desc) as rn
  from public.counselor_bookings
  where status = 'pending'
)
delete from public.counselor_bookings
where id in (select id from ranked where rn > 1);

-- Enforce uniqueness for future inserts
create unique index if not exists counselor_bookings_pending_unique
  on public.counselor_bookings (counselor_id, client_user_id)
  where status = 'pending';
