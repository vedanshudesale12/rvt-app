-- Admins may update events (including soft-delete via deleted_at).
-- Select already hides rows where deleted_at is set.
create policy events_admin_update on public.events
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
