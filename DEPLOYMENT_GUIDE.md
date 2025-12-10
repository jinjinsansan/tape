# ミシェルAI デプロイメントガイド

本番環境へのデプロイ手順を説明します。

---

## 📋 デプロイ前チェックリスト

### ✅ 完了している項目
- [x] コードの実装（97ファイル、1,654行）
- [x] ビルドテスト合格
- [x] Lintテスト合格
- [x] GitHubへのプッシュ完了

### 🔄 実行が必要な項目
- [ ] **Step 1**: Vercel環境変数の設定
- [ ] **Step 2**: Supabaseマイグレーションの実行
- [ ] **Step 3**: RAGデータベースへの知識投入
- [ ] **Step 4**: SINR処理の実行

---

## Step 1: Vercel環境変数の設定

### 必須環境変数

Vercelダッシュボード（Settings → Environment Variables）で以下を設定してください：

#### 1. Supabase関連（既存）
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

#### 2. OpenAI関連（ミシェルAI用）✨ 新規
```env
OPENAI_API_KEY=sk-proj-...
MICHELLE_ASSISTANT_ID=asst_...
```

**確認方法**:
- あなたが「既にVercelには OPENAI_API_KEY、アシスタントIDは 環境変数にセットしています」と言っていたので、これは**既に設定済み**のはずです
- Vercelダッシュボードで確認: https://vercel.com/your-project/settings/environment-variables

#### 3. RAG設定（オプション）
```env
USE_SINR_RAG=true
```
デフォルトで`true`なので、明示的に設定しなくても動作します。

### ⚠️ 注意事項
- 環境変数を追加・変更した後は、**Vercelで再デプロイ**が必要です
- Deployments → Redeploy を実行してください

---

## Step 2: Supabaseマイグレーションの実行

### 必要なマイグレーション

以下の2つのマイグレーションを実行します：

#### マイグレーション1: ミシェルAI基本テーブル（既に実行済みの可能性あり）
**ファイル**: `supabase/migrations/202412082355_michelle_ai.sql`

このマイグレーションは**既に実行されている可能性が高い**です。確認してください。

#### マイグレーション2: SINRテーブル ✨ 新規
**ファイル**: `supabase/migrations/202412100003_add_sinr_tables.sql`

**このマイグレーションは実行が必要です！**

### 実行方法

#### オプションA: Supabaseダッシュボード（推奨）

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左サイドバー → **SQL Editor** をクリック
4. ローカルファイル `supabase/migrations/202412100003_add_sinr_tables.sql` の内容をコピー
5. SQL Editorにペースト
6. **Run** をクリック

**確認コマンド**:
```sql
-- 実行後、以下のクエリでテーブル作成を確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'michelle_knowledge%'
ORDER BY table_name;

-- 期待される結果:
-- michelle_knowledge
-- michelle_knowledge_children
-- michelle_knowledge_parents
```

#### オプションB: Supabase CLI（上級者向け）

```bash
# Supabase CLIがインストールされている場合
supabase db push

# または特定のマイグレーションを実行
supabase migration up
```

### マイグレーションの内容

このマイグレーションは以下を作成します：

1. **michelle_knowledge_parents** テーブル
   - 親チャンク（800文字）を保存
   - LLMに渡すための大きいコンテキスト

2. **michelle_knowledge_children** テーブル
   - 子チャンク（200文字）を保存
   - ベクトル検索用のembedding付き

3. **match_michelle_knowledge_sinr()** RPC関数
   - 子チャンクで検索 → 親チャンクを返す

---

## Step 3: RAGデータベースへの知識投入

### 概要

89個のマークダウンファイル（心理学知識）をデータベースに投入します。

### 前提条件

- **ローカル環境**で実行します（Vercel上では実行しません）
- **.env** ファイルが必要です

### 手順

#### 3-1. .envファイルを作成

プロジェクトルートに `.env` ファイルを作成：

```bash
cd /mnt/e/dev/Cusor/tape
nano .env  # または好きなエディタで
```

**内容**:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-proj-...
```

⚠️ `.env` ファイルは `.gitignore` に含まれているので、Gitにコミットされません。

#### 3-2. RAGアップロードスクリプトを実行

```bash
# 既存データをクリアして新規アップロード（推奨）
npm run upload-michelle-knowledge -- --clear

# または既存データを保持して追加
npm run upload-michelle-knowledge
```

**処理内容**:
- 89個のマークダウンファイルを読み込み
- 各ファイルを1000文字チャンクに分割
- OpenAI APIでembedding生成（約10-15分）
- `michelle_knowledge` テーブルに保存

**進捗表示例**:
```
🚀 ミシェル知識ベースのアップロード開始

📁 ディレクトリ: /path/to/tape/apps/web/md/michelle

📚 85個のファイルを発見

[1/85]
📄 処理中: 01_gairon/tape_shinrigaku_toha.md
  ✅ チャンク 0/5 完了
  ✅ チャンク 1/5 完了
  ...
✅ 01_gairon/tape_shinrigaku_toha.md 完了

[2/85]
...

🎉 全てのアップロード完了！
```

**推定時間**: 10-15分
**推定コスト**: OpenAI embedding API - 約$0.50-1.00

---

## Step 4: SINR処理の実行

### 概要

RAGデータをSINR形式（親/子チャンク）に変換します。

### 前提条件

- Step 2（マイグレーション）が完了している
- Step 3（RAG投入）が完了している

### 実行方法

#### オプションA: ブラウザから実行（推奨）

1. Vercelにデプロイ後、ブラウザで以下のURLにアクセス：
```
https://your-app.vercel.app/api/sinr-process-all
```

2. リアルタイムで進捗が表示されます（Server-Sent Events）：
```json
{"type":"start","message":"Starting SINR processing..."}
{"type":"files_found","count":85}
{"type":"progress","current":1,"total":85,"percent":1}
{"type":"file_start","filename":"01_gairon/tape_shinrigaku_toha.md"}
{"type":"file_complete","filename":"01_gairon/tape_shinrigaku_toha.md","parents":3,"children":12}
...
{"type":"complete","summary":{"totalFiles":85,"successful":85,...}}
```

#### オプションB: curlコマンド

```bash
curl https://your-app.vercel.app/api/sinr-process-all
```

#### オプションC: 単一ファイルのテスト

```bash
curl -X POST https://your-app.vercel.app/api/sinr-process-file \
  -H "Content-Type: application/json" \
  -d '{"filename":"01_gairon/tape_shinrigaku_toha.md"}'
```

**推定時間**: 20-30分
**推定コスト**: OpenAI embedding API - 約$1.00-2.00

### SINR処理の確認

Supabase SQL Editorで確認：

```sql
-- 親チャンクの数
SELECT COUNT(*) as parent_count 
FROM michelle_knowledge_parents;

-- 子チャンクの数
SELECT COUNT(*) as child_count 
FROM michelle_knowledge_children;

-- ファイル別の統計
SELECT 
  source,
  COUNT(*) as parent_count,
  SUM((metadata->>'child_count')::int) as total_children
FROM michelle_knowledge_parents
GROUP BY source
ORDER BY source
LIMIT 10;
```

**期待される結果**:
- 親チャンク: 約200-300個
- 子チャンク: 約800-1200個

---

## 🎯 デプロイ完了後の確認

### 1. ミシェルAIチャット画面にアクセス

```
https://your-app.vercel.app/michelle/chat
```

### 2. 動作確認

1. **カテゴリー選択**を確認
   - 恋愛・人生・人間関係の3つのボタン

2. **メッセージ送信**をテスト
   - 例: "トラウマについて教えてください"
   - 思考メッセージアニメーション（ドット）が表示される
   - AIからの応答が返ってくる

3. **ログを確認**（Vercel Dashboard → Logs）
   ```
   [RAG] Starting knowledge retrieval...
   [RAG SINR] Attempting with threshold: 0.65
   [RAG SINR] RPC returned 8 matches
   [Michelle Chat] User message: "トラウマについて..."
   [Michelle Chat] RAG matches: 8
   [Michelle Chat] Chat completion successful
   ```

### 3. トラブルシューティング

#### エラー: "OPENAI_API_KEY is not configured"
→ Vercel環境変数を確認、再デプロイ

#### エラー: "match_michelle_knowledge_sinr does not exist"
→ Step 2のマイグレーションを実行

#### 応答が返ってこない
→ Vercelのログを確認、タイムアウトの可能性

---

## 📊 実行スケジュール例

### 推奨順序

| Step | タスク | 場所 | 所要時間 |
|------|--------|------|----------|
| 1 | 環境変数設定 | Vercel | 5分 |
| 2 | マイグレーション実行 | Supabase | 5分 |
| 3 | RAGデータ投入 | ローカル | 15分 |
| 4 | SINR処理実行 | Vercel API | 30分 |
| - | **合計** | - | **約55分** |

### タイムライン

```
00:00 - Step 1: Vercel環境変数設定
00:05 - Step 2: Supabaseマイグレーション
00:10 - Step 3: RAGデータ投入開始（バックグラウンド）
00:25 - Step 3: 完了確認
00:30 - Step 4: SINR処理開始
01:00 - Step 4: 完了、動作確認
01:05 - 🎉 デプロイ完了！
```

---

## 🔐 セキュリティチェックリスト

- [ ] `.env` ファイルがGitにコミットされていないことを確認
- [ ] OPENAI_API_KEYが安全に保管されている
- [ ] SUPABASE_SERVICE_ROLE_KEYが外部に漏れていない
- [ ] Vercel環境変数が正しく設定されている

---

## 📞 サポート

問題が発生した場合：

1. **Vercelログを確認**: Vercel Dashboard → Logs
2. **Supabaseログを確認**: Supabase Dashboard → Logs
3. **エラーメッセージをコピー**して分析

---

## ✅ デプロイ完了チェックリスト

- [ ] Vercel環境変数設定完了
- [ ] Supabaseマイグレーション実行完了
- [ ] RAGデータ投入完了（89ファイル）
- [ ] SINR処理完了（親/子チャンク作成）
- [ ] チャット画面で動作確認完了
- [ ] ログに異常がないことを確認

**全てチェック完了したら、ミシェルAIは本番環境で稼働開始です！** 🚀
