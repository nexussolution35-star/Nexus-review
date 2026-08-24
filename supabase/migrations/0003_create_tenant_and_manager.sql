-- Manager onboarding (PRD §9).
-- A newly signed-up auth user has no app_users row yet, so RLS would block any
-- insert. This SECURITY DEFINER function atomically creates the tenant and the
-- caller's manager app_users row, keyed to auth.uid(). It is the only path by
-- which a brand new manager bootstraps their tenant.

create or replace function public.create_tenant_and_manager(
  p_restaurant_name text,
  p_manager_name text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_tenant_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- One tenant per manager account: refuse if this user is already set up.
  if exists (select 1 from public.app_users where id = v_uid) then
    raise exception 'This account is already linked to a restaurant';
  end if;

  select email into v_email from auth.users where id = v_uid;

  insert into public.tenants (name)
  values (coalesce(nullif(trim(p_restaurant_name), ''), 'My restaurant'))
  returning id into v_tenant_id;

  insert into public.app_users (id, tenant_id, role, name, email)
  values (v_uid, v_tenant_id, 'manager', nullif(trim(p_manager_name), ''), v_email);

  return v_tenant_id;
end;
$$;

-- Only signed-in users may call it; anon cannot.
revoke all on function public.create_tenant_and_manager(text, text) from public, anon;
grant execute on function public.create_tenant_and_manager(text, text) to authenticated;
