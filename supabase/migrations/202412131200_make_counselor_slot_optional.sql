-- Allow counselor bookings to exist without a reserved slot (chat-first flow)
alter table public.counselor_bookings
  alter column slot_id drop not null;
