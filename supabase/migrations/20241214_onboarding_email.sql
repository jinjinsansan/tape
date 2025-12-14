-- Add onboarding email system columns to profiles table
alter table public.profiles
add column if not exists onboarding_email_step integer not null default 0,
add column if not exists onboarding_email_enabled boolean not null default true,
add column if not exists onboarding_email_completed boolean not null default false,
add column if not exists onboarding_email_started_at timestamp with time zone default now();

comment on column public.profiles.onboarding_email_step is 'Current step of onboarding email (0-8, 0=not started)';
comment on column public.profiles.onboarding_email_enabled is 'Whether user wants to receive onboarding emails';
comment on column public.profiles.onboarding_email_completed is 'Whether user has completed all 8 steps';
comment on column public.profiles.onboarding_email_started_at is 'Timestamp when first onboarding email was sent';

-- Create index for efficient cron job queries
create index if not exists idx_profiles_onboarding_email 
on public.profiles(onboarding_email_enabled, onboarding_email_step, onboarding_email_started_at)
where onboarding_email_enabled = true and onboarding_email_completed = false;

comment on index idx_profiles_onboarding_email is 'Optimize onboarding email cron job queries';
