-- Add accepting_bookings column to counselors table
-- is_active: アカウント有効/無効（無効なら非表示）
-- accepting_bookings: 予約受付中/停止中（停止中でも表示される）
alter table public.counselors
add column if not exists accepting_bookings boolean not null default true;

comment on column public.counselors.accepting_bookings is '予約受付中フラグ（false でも表示されるが予約不可）';

-- Create index for efficient filtering
create index if not exists idx_counselors_accepting_bookings 
on public.counselors(accepting_bookings) 
where is_active = true;
