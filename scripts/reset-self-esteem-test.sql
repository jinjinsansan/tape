-- Usage: psql <connection-string> -f reset-self-esteem-test.sql
-- Set these before running or replace placeholders inline
\set user_id 'YOUR_USER_ID_HERE'
\set test_date '2026-01-17'

delete from public.emotion_diary_entries
where user_id = :'user_id' and journal_date = :'test_date';

update public.self_esteem_test_results
set is_posted_to_diary = false,
    diary_entry_id = null
where user_id = :'user_id' and test_date = :'test_date';
