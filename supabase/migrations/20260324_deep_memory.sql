-- カテゴリに person, episode を追加
ALTER TABLE public.telegram_bot_user_memories
  DROP CONSTRAINT telegram_bot_user_memories_category_check;

ALTER TABLE public.telegram_bot_user_memories
  ADD CONSTRAINT telegram_bot_user_memories_category_check
  CHECK (category IN ('profile','emotion_pattern','duct_tape','insight','context','person','episode'));

-- metadataカラム追加（人物名・関係性・関連人物・日付等を構造化保存）
ALTER TABLE public.telegram_bot_user_memories
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

-- ユーザー理解サマリーテーブル
CREATE TABLE public.telegram_bot_user_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.telegram_bot_sessions(id) ON DELETE CASCADE,
  summary text NOT NULL,
  person_map text NOT NULL DEFAULT '',
  message_count_at_generation integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX telegram_bot_summaries_session_idx
  ON public.telegram_bot_user_summaries(session_id);

ALTER TABLE public.telegram_bot_user_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY telegram_bot_summaries_service_role
  ON public.telegram_bot_user_summaries FOR ALL
  TO service_role USING (true) WITH CHECK (true);
