create table if not exists public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  subject text not null,
  body text not null,
  audience text not null check (audience in ('all', 'selected')),
  target_user_ids uuid[] not null default '{}',
  target_emails text[] not null default '{}',
  target_count integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists admin_broadcasts_created_at_idx on public.admin_broadcasts (created_at desc);
