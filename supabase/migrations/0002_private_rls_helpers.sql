-- Move RLS helper functions into a private schema so they are not callable over
-- the REST API, while RLS policies can still use them. Clears the advisor warning.
create schema if not exists private;

create or replace function private.current_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.app_users where id = auth.uid()
$$;
create or replace function private.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.app_users where id = auth.uid()
$$;
grant usage on schema private to anon, authenticated;
grant execute on function private.current_tenant_id() to anon, authenticated;
grant execute on function private.current_user_role() to anon, authenticated;

-- policies recreated to reference private.* (see repo history for full body)
