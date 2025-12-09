begin;

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
