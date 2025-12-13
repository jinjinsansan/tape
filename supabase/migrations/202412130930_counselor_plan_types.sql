begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'counselor_plan_type') then
    create type counselor_plan_type as enum ('single_session', 'monthly_course');
  end if;
end;
$$;

alter table public.counselor_bookings
  add column if not exists plan_type counselor_plan_type;

update public.counselor_bookings
  set plan_type = 'single_session'
  where plan_type is null;

alter table public.counselor_bookings
  alter column plan_type set not null,
  alter column plan_type set default 'single_session';

commit;
