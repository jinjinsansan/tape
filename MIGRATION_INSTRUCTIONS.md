# ミシェルAI マイグレーション実行手順

Supabaseでマイグレーションを実行する手順です。

---

## 📋 事前確認

まず、現在の状態を確認します。

### Step 1: 現在のテーブル状態を確認

Supabase Dashboard → SQL Editor で以下を実行：

```sql
-- ミシェルAI関連のテーブルを確認
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'michelle%'
ORDER BY table_name;
```

**期待される結果**（実行済みの場合）:
```
table_name                      | table_type
--------------------------------|------------
michelle_knowledge              | BASE TABLE
michelle_knowledge_children     | BASE TABLE
michelle_knowledge_parents      | BASE TABLE
michelle_messages               | BASE TABLE
michelle_sessions               | BASE TABLE
```

---

## 🚀 マイグレーション実行

### マイグレーション: ミシェルAI完全セットアップ

**このSQLを丸ごとコピーして、Supabase SQL Editorに貼り付けて実行してください。**

---

#### 📄 コピペ用SQL（ここから）

```sql
begin;

-- Vector拡張を有効化
create extension if not exists "vector";

-- カスタム型の作成
do $$
begin
  if not exists (select 1 from pg_type where typname = 'michelle_session_category') then
    create type michelle_session_category as enum ('love', 'life', 'relationship');
  end if;

  if not exists (select 1 from pg_type where typname = 'michelle_message_role') then
    create type michelle_message_role as enum ('user', 'assistant', 'system');
  end if;
end$$;

-- セッションテーブル
create table if not exists public.michelle_sessions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  category michelle_session_category not null,
  title text,
  openai_thread_id text,
  total_tokens integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- メッセージテーブル
create table if not exists public.michelle_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.michelle_sessions(id) on delete cascade,
  role michelle_message_role not null,
  content text not null,
  tokens_used integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 知識ベーステーブル（通常RAG用）
create table if not exists public.michelle_knowledge (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- 知識ベース親チャンク（SINR用）
create table if not exists public.michelle_knowledge_parents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  source text not null,
  parent_index integer not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- 知識ベース子チャンク（SINR用）
create table if not exists public.michelle_knowledge_children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.michelle_knowledge_parents(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  child_index integer not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- インデックス作成
create index if not exists michelle_sessions_user_idx on public.michelle_sessions (auth_user_id);
create index if not exists michelle_messages_session_idx on public.michelle_messages (session_id);
create index if not exists michelle_knowledge_embedding_idx
  on public.michelle_knowledge using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists michelle_knowledge_parents_source_idx on public.michelle_knowledge_parents(source);
create index if not exists michelle_knowledge_children_parent_idx on public.michelle_knowledge_children(parent_id);
create index if not exists michelle_knowledge_children_embedding_idx
  on public.michelle_knowledge_children using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- タイムスタンプ更新トリガー
create trigger set_timestamp_michelle_sessions
  before update on public.michelle_sessions
  for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_michelle_messages
  before update on public.michelle_messages
  for each row execute function public.trigger_set_timestamp();

-- RLS有効化
alter table public.michelle_sessions enable row level security;
alter table public.michelle_messages enable row level security;
alter table public.michelle_knowledge enable row level security;
alter table public.michelle_knowledge_parents enable row level security;
alter table public.michelle_knowledge_children enable row level security;

-- RLSポリシー: セッション
create policy michelle_sessions_select_own
  on public.michelle_sessions
  for select using (auth.uid() = auth_user_id);

create policy michelle_sessions_mutate_own
  on public.michelle_sessions
  for all using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

-- RLSポリシー: メッセージ
create policy michelle_messages_select
  on public.michelle_messages
  for select using (
    exists (
      select 1 from public.michelle_sessions ms
      where ms.id = michelle_messages.session_id
        and ms.auth_user_id = auth.uid()
    )
  );

create policy michelle_messages_insert
  on public.michelle_messages
  for insert with check (
    exists (
      select 1 from public.michelle_sessions ms
      where ms.id = michelle_messages.session_id
        and ms.auth_user_id = auth.uid()
    )
  );

-- RLSポリシー: 知識ベース（service_roleのみ）
create policy michelle_knowledge_service_role
  on public.michelle_knowledge
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy michelle_knowledge_parents_service_role
  on public.michelle_knowledge_parents
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy michelle_knowledge_children_service_role
  on public.michelle_knowledge_children
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- RAG検索関数（通常）
create or replace function public.match_michelle_knowledge(
  query_embedding vector(1536),
  match_count int default 5,
  similarity_threshold double precision default 0.65
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    mk.id,
    mk.content,
    mk.metadata,
    1 - (mk.embedding <=> query_embedding) as similarity
  from public.michelle_knowledge mk
  where mk.embedding is not null
    and 1 - (mk.embedding <=> query_embedding) >= similarity_threshold
  order by mk.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

-- RAG検索関数（SINR）
create or replace function public.match_michelle_knowledge_sinr(
  query_embedding vector(1536),
  match_count int default 5,
  similarity_threshold double precision default 0.65
)
returns table (
  parent_id uuid,
  parent_content text,
  parent_metadata jsonb,
  parent_source text,
  child_similarity double precision
)
language sql
stable
as $$
  select distinct on (p.id)
    p.id as parent_id,
    p.content as parent_content,
    p.metadata as parent_metadata,
    p.source as parent_source,
    1 - (c.embedding <=> query_embedding) as child_similarity
  from public.michelle_knowledge_children c
  join public.michelle_knowledge_parents p on c.parent_id = p.id
  where c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by p.id, c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

commit;
```

#### 📄 コピペ用SQL（ここまで）

---

## ✅ 実行後の確認

マイグレーション実行後、以下のSQLで確認してください。

### 確認1: テーブルが作成されたか

```sql
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'michelle%'
ORDER BY table_name;
```

**期待される結果**: 5つのテーブル
- michelle_knowledge
- michelle_knowledge_children
- michelle_knowledge_parents
- michelle_messages
- michelle_sessions

---

### 確認2: 関数が作成されたか

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'match_michelle%'
ORDER BY routine_name;
```

**期待される結果**: 2つの関数
- match_michelle_knowledge
- match_michelle_knowledge_sinr

---

### 確認3: インデックスが作成されたか

```sql
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename LIKE 'michelle%'
ORDER BY tablename, indexname;
```

**期待される結果**: 複数のインデックス（embedding用のivfflat含む）

---

### 確認4: RLSが有効になっているか

```sql
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'michelle%'
ORDER BY tablename;
```

**期待される結果**: すべてのテーブルで `rowsecurity = true`

---

## 🎯 成功のサイン

すべての確認SQLが期待通りの結果を返したら、マイグレーションは成功です！

次のステップ:
- ✅ Step 2完了
- 次は Step 3: RAGデータベース投入

---

## ❌ エラーが出た場合

### よくあるエラー1: "extension vector does not exist"

**原因**: pgvector拡張がインストールされていない

**解決方法**: 
```sql
create extension vector;
```

---

### よくあるエラー2: "function trigger_set_timestamp does not exist"

**原因**: タイムスタンプトリガー関数が存在しない

**解決方法**: トリガー部分をコメントアウト（または既存のトリガー関数を作成）

---

### よくあるエラー3: "relation already exists"

**原因**: 既に実行済み

**解決方法**: これは問題ありません。`IF NOT EXISTS`を使っているので、既存のテーブルはスキップされます。

---

## 📞 次のアクション

マイグレーション完了後:

1. `DEPLOYMENT_GUIDE.md` の Step 3 に進む
2. RAGデータベースへの知識投入を実行
3. SINR処理を実行

---

**準備完了！SQL Editorにコピペして実行してください！** 🚀
