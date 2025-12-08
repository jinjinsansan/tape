begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'learning_lesson_status') then
    create type learning_lesson_status as enum ('locked', 'in_progress', 'completed');
  end if;
end;
$$;

create table if not exists public.learning_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  hero_url text,
  level text,
  tags text[] default array[]::text[],
  total_duration_seconds integer default 0,
  published boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.learning_course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.learning_courses(id) on delete cascade,
  order_index integer not null,
  title text not null,
  summary text,
  is_required boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (course_id, order_index)
);

create table if not exists public.learning_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.learning_course_modules(id) on delete cascade,
  slug text not null unique,
  order_index integer not null,
  title text not null,
  summary text,
  video_url text,
  video_duration_seconds integer,
  requires_quiz boolean not null default false,
  transcript text,
  resources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (module_id, order_index)
);

create table if not exists public.learning_lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.learning_lessons(id) on delete cascade,
  status learning_lesson_status not null default 'locked',
  last_position_seconds integer not null default 0,
  unlocked_at timestamptz default timezone('utc', now()),
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, lesson_id)
);

create table if not exists public.learning_lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.learning_lessons(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, lesson_id)
);

create table if not exists public.learning_quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.learning_lessons(id) on delete cascade,
  passing_score integer not null default 80,
  questions jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (lesson_id)
);

create table if not exists public.learning_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.learning_quizzes(id) on delete cascade,
  lesson_id uuid not null references public.learning_lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null,
  total_questions integer not null,
  answers jsonb not null,
  passed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (quiz_id, user_id)
);

create index if not exists learning_lessons_module_idx on public.learning_lessons(module_id);
create index if not exists learning_progress_lesson_idx on public.learning_lesson_progress(lesson_id);
create index if not exists learning_notes_lesson_idx on public.learning_lesson_notes(lesson_id);
create index if not exists learning_quiz_attempts_user_idx on public.learning_quiz_attempts(user_id);

create trigger set_timestamp_learning_courses
  before update on public.learning_courses
  for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_learning_course_modules
  before update on public.learning_course_modules
  for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_learning_lessons
  before update on public.learning_lessons
  for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_learning_lesson_progress
  before update on public.learning_lesson_progress
  for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_learning_lesson_notes
  before update on public.learning_lesson_notes
  for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_learning_quizzes
  before update on public.learning_quizzes
  for each row execute function public.trigger_set_timestamp();

alter table public.learning_courses enable row level security;
alter table public.learning_course_modules enable row level security;
alter table public.learning_lessons enable row level security;
alter table public.learning_lesson_progress enable row level security;
alter table public.learning_lesson_notes enable row level security;
alter table public.learning_quizzes enable row level security;
alter table public.learning_quiz_attempts enable row level security;

create policy learning_courses_public
  on public.learning_courses
  for select using (published = true);

create policy learning_course_modules_public
  on public.learning_course_modules
  for select using (
    exists (
      select 1 from public.learning_courses c
      where c.id = course_id and c.published = true
    )
  );

create policy learning_lessons_public
  on public.learning_lessons
  for select using (
    exists (
      select 1 from public.learning_course_modules m
      join public.learning_courses c on c.id = m.course_id
      where m.id = learning_lessons.module_id and c.published = true
    )
  );

create policy learning_progress_owner
  on public.learning_lesson_progress
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy learning_notes_owner
  on public.learning_lesson_notes
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy learning_quizzes_public
  on public.learning_quizzes
  for select using (
    exists (
      select 1 from public.learning_lessons l
      join public.learning_course_modules m on m.id = l.module_id
      join public.learning_courses c on c.id = m.course_id
      where l.id = learning_quizzes.lesson_id and c.published = true
    )
  );

create policy learning_quiz_attempts_owner
  on public.learning_quiz_attempts
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.learning_courses to anon, authenticated;
grant select on public.learning_course_modules to anon, authenticated;
grant select on public.learning_lessons to anon, authenticated;
grant select on public.learning_quizzes to anon, authenticated;
grant select, insert, update on public.learning_lesson_progress to authenticated;
grant select, insert, update on public.learning_lesson_notes to authenticated;
grant select, insert, update on public.learning_quiz_attempts to authenticated;

-- Seed beginner course structure
do $$
declare
  v_course_id uuid;
  v_module1 uuid;
  v_module2 uuid;
  v_module3 uuid;
  v_lesson uuid;
begin
  insert into public.learning_courses (slug, title, subtitle, description, hero_url, level, tags, total_duration_seconds, published)
  values (
    'beginner-course',
    'Tape式心理学 ビギナーコース',
    '感情の観察とセルフケアを体系的に学ぶ入門講座',
    'Tape式心理学の基礎概念、感情の分解手法、セルフノート術を3フェーズで学べる完全初心者向けコースです。',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b',
    'beginner',
    array['感情整理','セルフケア','マインドセット'],
    5400,
    true
  )
  on conflict (slug)
  do update set
    title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    hero_url = excluded.hero_url,
    level = excluded.level,
    tags = excluded.tags,
    total_duration_seconds = excluded.total_duration_seconds,
    published = excluded.published,
    updated_at = timezone('utc', now())
  returning id into v_course_id;

  -- Module 1
  insert into public.learning_course_modules (course_id, order_index, title, summary)
    values (v_course_id, 1, 'Phase 1: 観察と分解', '出来事・感情・身体感覚を切り離して観察するステップ')
  on conflict (course_id, order_index)
  do update set title = excluded.title, summary = excluded.summary, updated_at = timezone('utc', now())
  returning id into v_module1;

  insert into public.learning_lessons (module_id, slug, order_index, title, summary, video_url, video_duration_seconds, transcript)
  values
    (v_module1, 'phase1-lesson1', 1, 'Tape式心理学とは', 'Tape式が大切にしている前提と心理構造の見方を学びます。', 'https://www.youtube.com/embed/J---aiyznGQ', 900, 'Tape式心理学のイントロダクション'),
    (v_module1, 'phase1-lesson2', 2, '感情の三層構造', '出来事 / 解釈 / 反応 を分解して記録する方法を実演します。', 'https://www.youtube.com/embed/VYOjWnS4cMY', 1100, '感情を三層で捉えるワークガイド');

  -- Module 2
  insert into public.learning_course_modules (course_id, order_index, title, summary)
    values (v_course_id, 2, 'Phase 2: 思い込みを見抜く', '仮説立てとセルフ問いかけで核心に触れるプロセス')
  on conflict (course_id, order_index)
  do update set title = excluded.title, summary = excluded.summary, updated_at = timezone('utc', now())
  returning id into v_module2;

  insert into public.learning_lessons (module_id, slug, order_index, title, summary, video_url, video_duration_seconds, requires_quiz, transcript)
  values
    (v_module2, 'phase2-lesson1', 1, '仮説思考で感情を追う', '仮説を立てるフレームワークと落とし穴を学びます。', 'https://www.youtube.com/embed/2Vv-BfVoq4g', 1200, true, '仮説思考の実践記録'),
    (v_module2, 'phase2-lesson2', 2, 'セルフカウンセリング実演', 'Michelleノートを使ったセルフカウンセリングの実演。', 'https://www.youtube.com/embed/OPf0YbXqDm0', 1000, false, 'セルフカウンセリングライブ');

  -- Module 3
  insert into public.learning_course_modules (course_id, order_index, title, summary)
    values (v_course_id, 3, 'Phase 3: 行動設計とケア', 'セルフケアと具体的行動プランへの落とし込み方')
  on conflict (course_id, order_index)
  do update set title = excluded.title, summary = excluded.summary, updated_at = timezone('utc', now())
  returning id into v_module3;

  insert into public.learning_lessons (module_id, slug, order_index, title, summary, video_url, video_duration_seconds, transcript)
  values
    (v_module3, 'phase3-lesson1', 1, 'セルフケアメニューを作る', '感情波形に合わせたセルフケアメニューを設計します。', 'https://www.youtube.com/embed/Pkh8UtuejGw', 900, 'セルフケアメニュー作成ワーク'),
    (v_module3, 'phase3-lesson2', 2, '行動プランニング', '次の一歩を現実的に落とし込むプランニング術。', 'https://www.youtube.com/embed/fLexgOxsZu0', 950, '行動プラン記入例');

  -- Upsert quizzes
  insert into public.learning_quizzes (lesson_id, passing_score, questions)
  select id, 80, jsonb_build_array(
    jsonb_build_object(
      'id', 'q1',
      'question', 'Tape式心理学で最初に行うステップはどれ？',
      'choices', jsonb_build_array(
        jsonb_build_object('id', 'a', 'label', 'セルフケアメニューを作る'),
        jsonb_build_object('id', 'b', 'label', '出来事と感情を分離して観察する'),
        jsonb_build_object('id', 'c', 'label', '思い込みへの反論を書く')
      ),
      'answer', 'b'
    ),
    jsonb_build_object(
      'id', 'q2',
      'question', '感情を深掘りする際に重要な姿勢は？',
      'choices', jsonb_build_array(
        jsonb_build_object('id', 'a', 'label', '自分を責めないニュートラルな観察'),
        jsonb_build_object('id', 'b', 'label', '正解を先に決める'),
        jsonb_build_object('id', 'c', 'label', '第三者の評価を優先する')
      ),
      'answer', 'a'
    )
  )
  from public.learning_lessons
  where slug = 'phase2-lesson1'
  on conflict (lesson_id)
  do update set questions = excluded.questions, updated_at = timezone('utc', now());
end;
$$;

commit;
