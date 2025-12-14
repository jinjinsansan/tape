-- Efficient function to count diary entries per user
-- This avoids fetching all records and counting in JavaScript
create or replace function count_diary_entries_by_users(user_ids uuid[])
returns table(user_id uuid, count bigint)
language sql
stable
as $$
  select 
    user_id,
    count(*) as count
  from emotion_diary_entries
  where user_id = any(user_ids)
    and deleted_at is null
  group by user_id;
$$;

comment on function count_diary_entries_by_users is 'Efficiently count diary entries for multiple users using SQL aggregation';

-- Efficient function to get users who have written diary today
-- Returns distinct user_ids instead of fetching all records
create or replace function get_users_with_diary_today(p_journal_date date)
returns table(user_id uuid)
language sql
stable
as $$
  select distinct user_id
  from emotion_diary_entries
  where journal_date = p_journal_date
    and deleted_at is null;
$$;

comment on function get_users_with_diary_today is 'Get distinct list of users who have written diary on a specific date';
