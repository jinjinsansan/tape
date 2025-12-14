-- Add diary reminder preference to profiles table
alter table public.profiles
add column if not exists diary_reminder_enabled boolean not null default true;

comment on column public.profiles.diary_reminder_enabled is '日記リマインダーメールの配信設定（デフォルト: true）';
