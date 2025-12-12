begin;

-- =====================================
-- ポイント景品画像用ストレージバケット
-- =====================================

-- reward-images バケットを作成（存在しない場合）
insert into storage.buckets (id, name, public)
values ('reward-images', 'reward-images', true)
on conflict (id) do update set public = true;

-- 既存のポリシーを削除して再作成

drop policy if exists "Public read access for reward images" on storage.objects;
drop policy if exists "Admin users can upload reward images" on storage.objects;
drop policy if exists "Admin users can update reward images" on storage.objects;
drop policy if exists "Admin users can delete reward images" on storage.objects;

-- 全員が読み取り可能（パブリックバケット）
create policy "Public read access for reward images"
  on storage.objects
  for select
  using (bucket_id = 'reward-images');

-- 管理者のみがアップロード可能
-- profiles テーブルの role カラムで判定
create policy "Admin users can upload reward images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'reward-images' and
    auth.uid() is not null and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 管理者のみが更新可能
create policy "Admin users can update reward images"
  on storage.objects
  for update
  using (
    bucket_id = 'reward-images' and
    auth.uid() is not null and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 管理者のみが削除可能
create policy "Admin users can delete reward images"
  on storage.objects
  for delete
  using (
    bucket_id = 'reward-images' and
    auth.uid() is not null and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

commit;
