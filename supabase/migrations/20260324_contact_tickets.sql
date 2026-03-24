-- 仁さんへの相談チケット（番号管理）
CREATE TABLE line_contact_tickets (
  id serial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES line_bot_sessions(id) ON DELETE CASCADE,
  line_user_id text NOT NULL,
  display_name text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  resolved_message text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  resolved_at timestamptz
);

CREATE INDEX line_contact_tickets_status_idx ON line_contact_tickets(status, created_at DESC);

ALTER TABLE line_contact_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY line_contact_tickets_service
  ON line_contact_tickets FOR ALL
  TO service_role USING (true) WITH CHECK (true);
