-- このSQLをSupabase Dashboardの SQL Editorで実行して、
-- カウンセラー関連テーブルの状態を確認してください

-- 1. counselor_bookingsテーブルの存在確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('counselors', 'counselor_slots', 'counselor_bookings', 'counselor_intro_chats', 'counselor_intro_messages')
ORDER BY table_name;

-- 2. counselor_bookingsテーブルの外部キー制約を確認
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'counselor_bookings'
ORDER BY tc.constraint_name;

-- 3. counselorsテーブルのレコード数を確認
SELECT COUNT(*) as counselor_count FROM public.counselors;

-- 4. サンプルのカウンセラーデータを確認
SELECT id, display_name, slug, is_active, auth_user_id 
FROM public.counselors 
LIMIT 5;

-- 5. counselor_bookingsのサンプルデータを確認
SELECT 
  cb.id,
  cb.status,
  cb.payment_status,
  c.display_name as counselor_name,
  cs.start_time
FROM public.counselor_bookings cb
LEFT JOIN public.counselors c ON c.id = cb.counselor_id
LEFT JOIN public.counselor_slots cs ON cs.id = cb.slot_id
LIMIT 5;
