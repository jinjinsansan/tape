-- NAMIDAサポート協会LINE対応: session_id をnullableに + sourceカラム追加
ALTER TABLE line_contact_tickets
  ALTER COLUMN session_id DROP NOT NULL;

ALTER TABLE line_contact_tickets
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'michelle';

COMMENT ON COLUMN line_contact_tickets.source IS 'michelle = ミシェルAI LINE, namisapo = NAMIDAサポート協会LINE';
