# Course Seed Scripts

コースのカリキュラムデータをデータベースに投入するスクリプトです。

## 使い方

### 1. 環境変数の設定

`.env.local`に以下を設定してください：

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. シードの実行

```bash
# 心療内科キャンセルプログラムのカリキュラムを投入
npm run seed:psychiatry-cancel
```

### 3. データの確認

Supabaseダッシュボードで以下のテーブルを確認：
- `learning_course_modules` - モジュールが追加されている
- `learning_lessons` - レッスンが追加されている
- `learning_courses` - total_duration_secondsが更新されている

## データの編集

### レッスンの追加

`scripts/seed-psychiatry-cancel.ts`の`courseData`配列にレッスンを追加：

```typescript
{
  title: "心療内科キャンセルプログラム②",
  videoUrl: "https://www.youtube.com/embed/VIDEO_ID",
  summary: "動画の要約",
  keyPoints: [
    "重点ポイント1",
    "重点ポイント2"
  ],
  videoDurationSeconds: 720 // 秒単位
}
```

### レッスンの編集

既存のレッスンデータを直接編集して、シードを再実行すればOKです。

### 注意事項

- シードを実行すると、既存のモジュール・レッスンは**全て削除**されます
- ユーザーの進捗データ（progress, notes）は削除されません
- 動画IDが変わると、既存の進捗がリセットされる可能性があります

## トラブルシューティング

### エラー: Course not found

コースが存在しません。マイグレーションを実行してください：

```bash
# Supabase CLIで
supabase db push

# または Supabaseダッシュボードで
# supabase/migrations/20241211_courses_pricing_and_purchases.sql を実行
```

### エラー: Permission denied

`SUPABASE_SERVICE_ROLE_KEY`を確認してください。
