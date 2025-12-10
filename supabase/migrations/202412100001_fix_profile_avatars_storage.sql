begin;

-- =====================================
-- Part 1: プロフィールテーブルのINSERTポリシー追加
-- =====================================

-- 問題1: profiles テーブルに INSERT ポリシーがない
-- upsert は UPDATE → INSERT の順で試みるため、新規ユーザーは INSERT が必要
-- 解決: ユーザーが自分のプロフィールを作成できるポリシーを追加

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users can insert their own profile'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    create policy "Users can insert their own profile"
      on public.profiles
      for insert
      with check (auth.uid() = id);
  end if;
end $$;

-- 問題2: 新規ユーザー登録時にプロフィールレコードが自動作成されない
-- 解決: トリガーで自動作成

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'ユーザー'),
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 問題3: 既存ユーザーでプロフィールレコードが欠落している可能性
-- 解決: 既存ユーザーのプロフィールを作成

insert into public.profiles (id, display_name, created_at, updated_at)
select 
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.email, 'ユーザー'),
  now(),
  now()
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

-- =====================================
-- Part 2: ストレージポリシーの修正
-- =====================================

-- 既存のポリシーを削除して再作成（ownerチェックを緩和）

drop policy if exists "Public read access for profile avatars" on storage.objects;
drop policy if exists "Users can upload their own profile avatars" on storage.objects;
drop policy if exists "Users can update their own profile avatars" on storage.objects;
drop policy if exists "Users can delete their own profile avatars" on storage.objects;

-- 全員が読み取り可能（パブリックバケット）
create policy "Public read access for profile avatars"
  on storage.objects
  for select
  using (bucket_id = 'profile-avatars');

-- 認証済みユーザーは自分のフォルダにアップロード可能
-- パスは {user_id}/{filename} 形式を想定
create policy "Authenticated users can upload profile avatars"
  on storage.objects
  for insert
  with check (
    bucket_id = 'profile-avatars' and
    auth.uid() is not null and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 認証済みユーザーは自分のフォルダのファイルを更新可能
create policy "Authenticated users can update their profile avatars"
  on storage.objects
  for update
  using (
    bucket_id = 'profile-avatars' and
    auth.uid() is not null and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 認証済みユーザーは自分のフォルダのファイルを削除可能
create policy "Authenticated users can delete their profile avatars"
  on storage.objects
  for delete
  using (
    bucket_id = 'profile-avatars' and
    auth.uid() is not null and
    (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
