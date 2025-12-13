-- Add urgency tracking to michelle_sessions for crisis monitoring

begin;

-- Create urgency level enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'michelle_urgency_level') then
    create type michelle_urgency_level as enum ('normal', 'attention', 'urgent', 'critical');
  end if;
end$$;

-- Add urgency fields to michelle_sessions
alter table public.michelle_sessions
  add column if not exists urgency_level michelle_urgency_level not null default 'normal',
  add column if not exists urgency_notes text,
  add column if not exists urgency_updated_at timestamptz,
  add column if not exists urgency_updated_by uuid references auth.users(id);

-- Create index for filtering by urgency
create index if not exists michelle_sessions_urgency_idx 
  on public.michelle_sessions (urgency_level, updated_at desc);

-- Create index for master admin queries
create index if not exists michelle_sessions_updated_at_idx 
  on public.michelle_sessions (updated_at desc);

commit;
