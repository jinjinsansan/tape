-- Track per-lesson unlock purchases for installment-based courses
CREATE TABLE IF NOT EXISTS public.learning_lesson_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS learning_lesson_unlocks_user_lesson_idx
  ON public.learning_lesson_unlocks(user_id, lesson_id);

ALTER TABLE public.learning_lesson_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS learning_lesson_unlocks_owner_select
  ON public.learning_lesson_unlocks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS learning_lesson_unlocks_owner_insert
  ON public.learning_lesson_unlocks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
