begin;

-- =====================================
-- コメント投稿ポリシーの修正
-- =====================================

-- 問題: 現在のポリシーは日記の投稿者しかコメントできない
-- 期待: 公開日記には認証済みユーザー全員がコメントできる

-- 既存のINSERTポリシーを削除
drop policy if exists "diary_comments_insert_owner_or_author" on public.emotion_diary_comments;

-- 新しいINSERTポリシーを作成
-- 条件1: 公開日記（visibility = 'public'）に対しては誰でもコメント可能
-- 条件2: commenter_user_idは自分のユーザーIDである必要がある
create policy "Anyone can comment on public diary entries"
  on public.emotion_diary_comments
  for insert
  with check (
    -- 認証済みユーザーである
    auth.uid() is not null
    and
    -- 自分のユーザーIDでコメントしている
    commenter_user_id = auth.uid()
    and
    -- 日記が公開されている
    exists (
      select 1 from public.emotion_diary_entries e
      where e.id = emotion_diary_comments.entry_id
        and e.visibility = 'public'
        and e.deleted_at is null
    )
  );

-- UPDATEポリシーも追加（自分のコメントは編集できる）
drop policy if exists "diary_comments_update_own" on public.emotion_diary_comments;

create policy "Users can update their own comments"
  on public.emotion_diary_comments
  for update
  using (
    auth.uid() is not null
    and commenter_user_id = auth.uid()
  )
  with check (
    auth.uid() is not null
    and commenter_user_id = auth.uid()
  );

-- DELETEポリシーも追加（自分のコメント or 日記投稿者が削除できる）
drop policy if exists "diary_comments_delete_own_or_entry_owner" on public.emotion_diary_comments;

create policy "Users can delete their own comments or entry owner can delete"
  on public.emotion_diary_comments
  for delete
  using (
    auth.uid() is not null
    and (
      -- 自分のコメント
      commenter_user_id = auth.uid()
      or
      -- または日記の投稿者
      exists (
        select 1 from public.emotion_diary_entries e
        where e.id = emotion_diary_comments.entry_id
          and e.user_id = auth.uid()
      )
    )
  );

commit;
