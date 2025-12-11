-- Add pricing columns to learning_courses
ALTER TABLE public.learning_courses 
  ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'JPY';

-- Create course_purchases table
CREATE TABLE IF NOT EXISTS public.course_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'JPY',
  payment_method VARCHAR(50),
  payment_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  metadata JSONB DEFAULT '{}'::jsonb,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(user_id, course_id)
);

-- Indexes for course_purchases
CREATE INDEX IF NOT EXISTS course_purchases_user_idx ON public.course_purchases(user_id);
CREATE INDEX IF NOT EXISTS course_purchases_course_idx ON public.course_purchases(course_id);
CREATE INDEX IF NOT EXISTS course_purchases_status_idx ON public.course_purchases(status);

-- RLS for course_purchases
ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_purchases_owner
  ON public.course_purchases
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.course_purchases TO authenticated;

-- Trigger for updated_at
CREATE TRIGGER set_timestamp_course_purchases
  BEFORE UPDATE ON public.course_purchases
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- Delete existing beginner-course mock data
DO $$
DECLARE
  v_course_id UUID;
BEGIN
  -- Find and delete beginner-course
  SELECT id INTO v_course_id 
  FROM public.learning_courses 
  WHERE slug = 'beginner-course';
  
  IF v_course_id IS NOT NULL THEN
    -- Delete will cascade to modules, lessons, etc.
    DELETE FROM public.learning_courses WHERE id = v_course_id;
    RAISE NOTICE 'Deleted beginner-course and all related data';
  END IF;
END;
$$;

-- Insert 3 new courses (skeleton data - details to be filled later)
DO $$
DECLARE
  v_course1_id UUID;
  v_course2_id UUID;
  v_course3_id UUID;
BEGIN
  -- 1. 心療内科キャンセルプログラム (Free)
  INSERT INTO public.learning_courses (
    slug, 
    title, 
    subtitle, 
    description, 
    price,
    currency,
    hero_url, 
    level, 
    tags, 
    published
  ) VALUES (
    'psychiatry-cancel',
    '心療内科キャンセルプログラム',
    '心療内科に頼らず自分で心をケアする方法',
    '薬に頼らず、自分自身で感情を整える技術を学べる無料プログラムです。',
    0,  -- 無料
    'JPY',
    NULL,
    'beginner',
    ARRAY['無料', '初心者向け', 'セルフケア'],
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    updated_at = timezone('utc', now())
  RETURNING id INTO v_course1_id;

  -- 2. テープ式心理カウンセラー育成講座 (59,800円)
  INSERT INTO public.learning_courses (
    slug, 
    title, 
    subtitle, 
    description, 
    price,
    currency,
    hero_url, 
    level, 
    tags, 
    published
  ) VALUES (
    'counselor-training',
    'テープ式心理カウンセラー育成講座',
    'プロのカウンセラーを目指す本格講座',
    '心理カウンセリングの実践スキルを体系的に学び、プロフェッショナルとして活躍するための本格的な育成プログラムです。',
    59800,
    'JPY',
    NULL,
    'advanced',
    ARRAY['有料', 'プロ養成', 'カウンセリング'],
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    updated_at = timezone('utc', now())
  RETURNING id INTO v_course2_id;

  -- 3. 引き寄せ講座Permit (29,800円)
  INSERT INTO public.learning_courses (
    slug, 
    title, 
    subtitle, 
    description, 
    price,
    currency,
    hero_url, 
    level, 
    tags, 
    published
  ) VALUES (
    'attraction-permit',
    '引き寄せ講座Permit',
    '引き寄せの法則を科学的に学ぶ',
    '引き寄せの法則を心理学的アプローチで理解し、実生活で活用できるようになるための実践講座です。',
    29800,
    'JPY',
    NULL,
    'intermediate',
    ARRAY['有料', '引き寄せ', '実践'],
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    updated_at = timezone('utc', now())
  RETURNING id INTO v_course3_id;

  RAISE NOTICE 'Created 3 course skeletons: psychiatry-cancel, counselor-training, attraction-permit';
  RAISE NOTICE 'Course IDs: %, %, %', v_course1_id, v_course2_id, v_course3_id;
END;
$$;
