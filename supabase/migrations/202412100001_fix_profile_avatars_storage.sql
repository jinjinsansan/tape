begin;

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
