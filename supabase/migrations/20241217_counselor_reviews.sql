begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'counselor_review_status') then
    create type counselor_review_status as enum ('pending', 'approved', 'rejected');
  end if;
end;
$$;

create table if not exists public.counselor_reviews (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselors(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.counselor_bookings(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  status counselor_review_status not null default 'pending',
  is_anonymous boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint counselor_reviews_unique_booking unique (booking_id, reviewer_user_id),
  constraint counselor_reviews_unique_reviewer_per_counselor unique (counselor_id, reviewer_user_id)
);

create index if not exists counselor_reviews_counselor_idx on public.counselor_reviews(counselor_id, status, created_at desc);
create index if not exists counselor_reviews_reviewer_idx on public.counselor_reviews(reviewer_user_id, created_at desc);

create trigger set_timestamp_counselor_reviews
  before update on public.counselor_reviews
  for each row execute function public.trigger_set_timestamp();

alter table public.counselor_reviews enable row level security;

create policy counselor_reviews_public
  on public.counselor_reviews
  for select
  using (
    status = 'approved'
    or reviewer_user_id = auth.uid()
  );

create policy counselor_reviews_insert_policy
  on public.counselor_reviews
  for insert
  with check (auth.role() = 'authenticated' and reviewer_user_id = auth.uid());

create policy counselor_reviews_update_policy
  on public.counselor_reviews
  for update
  using (reviewer_user_id = auth.uid())
  with check (reviewer_user_id = auth.uid());

create policy counselor_reviews_delete_policy
  on public.counselor_reviews
  for delete
  using (reviewer_user_id = auth.uid());

create policy counselor_reviews_admin_moderation
  on public.counselor_reviews
  for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
