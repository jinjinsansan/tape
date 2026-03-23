-- LINE Botセッション
CREATE TABLE line_bot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id text NOT NULL UNIQUE,
  display_name text,
  message_count integer NOT NULL DEFAULT 0,
  trial_started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX line_bot_sessions_user_idx ON line_bot_sessions(line_user_id);

CREATE TRIGGER set_timestamp_line_bot_sessions
  BEFORE UPDATE ON line_bot_sessions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- LINE Botメッセージ履歴
CREATE TABLE line_bot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES line_bot_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX line_bot_messages_session_idx ON line_bot_messages(session_id, created_at DESC);

-- サブスクリプション管理
CREATE TABLE line_bot_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES line_bot_sessions(id) ON DELETE CASCADE,
  paypal_subscription_id text,
  status text NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'cancelled', 'expired')),
  plan_amount integer NOT NULL DEFAULT 1980,
  trial_ends_at timestamptz NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX line_bot_subscriptions_session_idx ON line_bot_subscriptions(session_id);

CREATE TRIGGER set_timestamp_line_bot_subscriptions
  BEFORE UPDATE ON line_bot_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- RLS
ALTER TABLE line_bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_bot_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY line_bot_sessions_service ON line_bot_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY line_bot_messages_service ON line_bot_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY line_bot_subscriptions_service ON line_bot_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
