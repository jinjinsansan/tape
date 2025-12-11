-- Add notification_category enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'notification_category'
  ) THEN
    CREATE TYPE public.notification_category AS ENUM ('announcement', 'booking', 'wallet', 'other');
  END IF;
END
$$;

-- Add category column to notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category public.notification_category NOT NULL DEFAULT 'other';

UPDATE public.notifications
  SET category = 'other'
  WHERE category IS NULL;

-- Update enqueue_notification function to accept category
DROP FUNCTION IF EXISTS public.enqueue_notification(uuid, public.notification_channel, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.enqueue_notification(
  p_user_id uuid,
  p_channel public.notification_channel,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_category public.notification_category DEFAULT 'other'
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification public.notifications;
BEGIN
  INSERT INTO public.notifications(user_id, channel, type, title, body, data, category)
  VALUES (p_user_id, p_channel, p_type, p_title, p_body, COALESCE(p_data, '{}'::jsonb), p_category)
  RETURNING * INTO v_notification;

  RETURN v_notification;
END;
$$;
