begin;

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Public read access for profile avatars'
      and schemaname = 'storage'
      and tablename = 'objects'
  ) then
    create policy "Public read access for profile avatars"
      on storage.objects
      for select
      using (bucket_id = 'profile-avatars');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users can upload their own profile avatars'
      and schemaname = 'storage'
      and tablename = 'objects'
  ) then
    create policy "Users can upload their own profile avatars"
      on storage.objects
      for insert
      with check (bucket_id = 'profile-avatars' and auth.uid() = owner);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users can update their own profile avatars'
      and schemaname = 'storage'
      and tablename = 'objects'
  ) then
    create policy "Users can update their own profile avatars"
      on storage.objects
      for update
      using (bucket_id = 'profile-avatars' and auth.uid() = owner)
      with check (bucket_id = 'profile-avatars' and auth.uid() = owner);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users can delete their own profile avatars'
      and schemaname = 'storage'
      and tablename = 'objects'
  ) then
    create policy "Users can delete their own profile avatars"
      on storage.objects
      for delete
      using (bucket_id = 'profile-avatars' and auth.uid() = owner);
  end if;
end $$;

commit;
