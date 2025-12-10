begin;

-- 1. emotion_diary_entries にカウンセラーコメント関連のカラムを追加
alter table public.emotion_diary_entries
  add column if not exists counselor_memo text,
  add column if not exists counselor_name text,
  add column if not exists is_visible_to_user boolean default false,
  add column if not exists counselor_memo_read boolean default false,
  add column if not exists assigned_counselor text,
  add column if not exists urgency_level text check (urgency_level in ('', 'low', 'medium', 'high'));

-- 2. インデックスを追加（パフォーマンス向上）
create index if not exists idx_emotion_diary_entries_is_visible_to_user 
  on public.emotion_diary_entries(is_visible_to_user);
create index if not exists idx_emotion_diary_entries_counselor_memo_read 
  on public.emotion_diary_entries(counselor_memo_read);
create index if not exists idx_emotion_diary_entries_counselor_name 
  on public.emotion_diary_entries(counselor_name);
create index if not exists idx_emotion_diary_entries_assigned_counselor 
  on public.emotion_diary_entries(assigned_counselor);
create index if not exists idx_emotion_diary_entries_urgency_level 
  on public.emotion_diary_entries(urgency_level);

-- 3. コメントを追加
comment on column public.emotion_diary_entries.counselor_memo is 'カウンセラーのメモ内容';
comment on column public.emotion_diary_entries.counselor_name is 'メモを書いたカウンセラーの名前（必ず表示）';
comment on column public.emotion_diary_entries.is_visible_to_user is 'カウンセラーメモをユーザーに表示するかどうか';
comment on column public.emotion_diary_entries.counselor_memo_read is 'ユーザーがカウンセラーコメントを既読したか';
comment on column public.emotion_diary_entries.assigned_counselor is '担当カウンセラーの名前';
comment on column public.emotion_diary_entries.urgency_level is '緊急度（high, medium, low, 空文字列）';

-- 4. profiles.role にチェック制約を追加（admin, counselor, member）
-- 既存のデータを保護するため、まず制約を削除してから再作成
do $$
begin
  -- 既存の制約を削除（存在する場合）
  if exists (
    select 1 from pg_constraint 
    where conname = 'profiles_role_check' 
    and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;
  
  -- 新しい制約を追加
  alter table public.profiles 
    add constraint profiles_role_check 
    check (role in ('admin', 'counselor', 'member', 'user'));
end $$;

commit;
