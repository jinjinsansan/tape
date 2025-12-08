begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'slot_status') then
    create type slot_status as enum ('available', 'held', 'booked', 'unavailable');
  end if;

  if not exists (select 1 from pg_type where typname = 'intro_chat_status') then
    create type intro_chat_status as enum ('open', 'resolved', 'closed');
  end if;
end;
$$;

create table if not exists public.counselors (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  specialties text[] default array[]::text[],
  hourly_rate_cents integer not null default 12000,
  intro_video_url text,
  is_active boolean not null default true,
  profile_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.counselor_slots (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselors(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status slot_status not null default 'available',
  held_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint slot_time_range check (end_time > start_time)
);

create unique index if not exists counselor_slots_unique on public.counselor_slots(counselor_id, start_time);

create table if not exists public.counselor_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.counselor_slots(id) on delete cascade,
  counselor_id uuid not null references public.counselors(id) on delete cascade,
  client_user_id uuid not null references auth.users(id) on delete cascade,
  status booking_status not null default 'pending',
  price_cents integer not null,
  currency text not null default 'JPY',
  notes text,
  intro_chat_id uuid,
  payment_status text not null default 'unpaid',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bookings_unique_client_slot unique (slot_id, client_user_id)
);

create table if not exists public.counselor_intro_chats (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.counselor_bookings(id) on delete cascade,
  status intro_chat_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.counselor_intro_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.counselor_intro_chats(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  role text not null default 'client',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.counselor_booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.counselor_bookings(id) on delete cascade,
  transaction_id uuid references public.transactions(id),
  amount_cents integer not null,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp_counselors
  before update on public.counselors
  for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_counselor_slots
  before update on public.counselor_slots
  for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_counselor_bookings
  before update on public.counselor_bookings
  for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_counselor_intro_chats
  before update on public.counselor_intro_chats
  for each row execute function public.trigger_set_timestamp();

alter table public.counselors enable row level security;
alter table public.counselor_slots enable row level security;
alter table public.counselor_bookings enable row level security;
alter table public.counselor_intro_chats enable row level security;
alter table public.counselor_intro_messages enable row level security;
alter table public.counselor_booking_payments enable row level security;

create policy counselors_public
  on public.counselors for select using (is_active = true);

create policy counselor_slots_public
  on public.counselor_slots for select using (
    exists (
      select 1 from public.counselors c
      where c.id = counselor_id and c.is_active = true
    )
  );

create policy counselor_bookings_client
  on public.counselor_bookings
  using (auth.uid() = client_user_id)
  with check (auth.uid() = client_user_id);

create policy counselor_bookings_owner
  on public.counselor_bookings
  for select using (auth.uid() = client_user_id or auth.uid() = counselor_id);

create policy counselor_intro_messages_owner
  on public.counselor_intro_messages
  using (
    exists (
      select 1 from public.counselor_intro_chats c
      join public.counselor_bookings b on b.id = c.booking_id
      where c.id = counselor_intro_messages.chat_id
        and (auth.uid() = b.client_user_id or auth.uid() = b.counselor_id)
    )
  ) with check (
    exists (
      select 1 from public.counselor_intro_chats c
      join public.counselor_bookings b on b.id = c.booking_id
      where c.id = counselor_intro_messages.chat_id
        and (auth.uid() = b.client_user_id or auth.uid() = b.counselor_id)
    )
  );

grant select on public.counselors, public.counselor_slots to anon, authenticated;
grant select, insert, update on public.counselor_bookings to authenticated;
grant select, insert on public.counselor_intro_messages to authenticated;
grant select, insert on public.counselor_booking_payments to authenticated;

-- Seed example counselors
do $$
declare
  v_demo_counselors constant jsonb = jsonb_build_array(
    jsonb_build_object(
      'slug', 'counselor-aya',
      'display_name', '彩 (Aya)',
      'avatar_url', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
      'bio', 'Tape式心理学シニアカウンセラー。職場の人間関係と自尊心テーマを得意としています。',
      'specialties', array['職場','自尊心','HSP'],
      'hourly_rate_cents', 15000,
      'intro_video_url', 'https://www.youtube.com/embed/ysz5S6PUM-U'
    ),
    jsonb_build_object(
      'slug', 'counselor-yuto',
      'display_name', '優斗 (Yuto)',
      'avatar_url', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
      'bio', '元エンジニアのカウンセラー。恋愛依存、孤独感、夜間の不安に伴走します。',
      'specialties', array['恋愛','孤独','夜間不安'],
      'hourly_rate_cents', 13000,
      'intro_video_url', null
    )
  );
  v_item jsonb;
begin
  for v_item in select * from jsonb_array_elements(v_demo_counselors)
  loop
    insert into public.counselors (
      auth_user_id,
      slug,
      display_name,
      avatar_url,
      bio,
      specialties,
      hourly_rate_cents,
      intro_video_url
    )
    select
      auth.id,
      (v_item->>'slug'),
      (v_item->>'display_name'),
      (v_item->>'avatar_url'),
      (v_item->>'bio'),
      array(select jsonb_array_elements_text(v_item->'specialties')),
      (v_item->>'hourly_rate_cents')::int,
      nullif(v_item->>'intro_video_url', '')
    from auth.users auth
    order by auth.created_at
    limit 1
    on conflict (slug) do update set
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      bio = excluded.bio,
      specialties = excluded.specialties,
      hourly_rate_cents = excluded.hourly_rate_cents,
      intro_video_url = excluded.intro_video_url,
      updated_at = timezone('utc', now());
  end loop;
end;
$$;

commit;
