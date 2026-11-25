-- Runs on Supabase, where auth.users already exists. Skipped by local tests
-- that only have a stub auth.uid().

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'raw_user_meta_data'
  ) then
    execute $fn$
      create or replace function private.handle_new_user()
      returns trigger
      language plpgsql
      security definer
      set search_path = ''
      as $body$
      begin
        perform set_config('app.trusted', 'on', true);
        insert into public.profiles (id, full_name, role, status)
        values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', 'New user'), 120), null, 'pending')
        on conflict (id) do nothing;
        insert into public.profile_private (profile_id, email)
        values (new.id, lower(new.email))
        on conflict (profile_id) do nothing;
        return new;
      end;
      $body$;
    $fn$;
    execute 'drop trigger if exists on_auth_user_created on auth.users';
    execute 'create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user()';
  end if;
end $$;
