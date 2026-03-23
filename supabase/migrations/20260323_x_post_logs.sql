-- X自動投稿ログテーブル
CREATE TABLE x_post_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL,
  quote_text TEXT NOT NULL,
  quote_source TEXT NOT NULL,
  quote_character TEXT,
  post_body TEXT NOT NULL,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted'
    CHECK (status IN ('posted', 'failed')),
  x_post_id TEXT,
  error_message TEXT,
  cron_slot TEXT NOT NULL,
  posted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX x_post_logs_quote_idx ON x_post_logs(quote_id, posted_at);
CREATE INDEX x_post_logs_posted_at_idx ON x_post_logs(posted_at DESC);
