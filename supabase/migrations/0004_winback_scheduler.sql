-- Win-back automation.
-- A win-back message is scheduled for a future time (production: 14 days after
-- the customer goes quiet; demo: 5 minutes). A background job (pg_cron) checks
-- every minute and fires any that are due to the tenant's win-back WhatsApp
-- webhook via pg_net, with the customer's name and offer details as variables.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- When the message is due, and when it actually fired.
alter table public.winback_state
  add column if not exists scheduled_send_at timestamptz,
  add column if not exists message_sent_at timestamptz;

-- South African local number -> E.164 (+27...), so WhatsApp can deliver.
create or replace function private.to_e164_sa(raw text)
returns text language sql immutable
set search_path = ''
as $$
  select case
    when raw is null then null
    when regexp_replace(raw, '\D', '', 'g') = '' then null
    when left(btrim(raw), 1) = '+' then '+' || regexp_replace(raw, '\D', '', 'g')
    when left(regexp_replace(raw, '\D', '', 'g'), 2) = '27' then '+' || regexp_replace(raw, '\D', '', 'g')
    when left(regexp_replace(raw, '\D', '', 'g'), 1) = '0' then '+27' || substr(regexp_replace(raw, '\D', '', 'g'), 2)
    when length(regexp_replace(raw, '\D', '', 'g')) = 9 then '+27' || regexp_replace(raw, '\D', '', 'g')
    else '+' || regexp_replace(raw, '\D', '', 'g')
  end
$$;

-- Fire every win-back that is due but not yet sent. Runs in-database with full
-- access; posts the customer's details to the matching win-back campaign webhook.
create or replace function private.process_due_winbacks()
returns integer
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  r record;
  n int := 0;
  v_offer_expires timestamptz;
begin
  for r in
    select w.id, w.stage, w.tenant_id,
           c.name, c.phone, c.opted_out,
           t.name as restaurant,
           cam.name as campaign_name, cam.webhook_url, cam.offer_text, cam.expiry_days
    from public.winback_state w
    join public.contacts c on c.id = w.contact_id
    join public.tenants t on t.id = w.tenant_id
    left join public.campaigns cam
      on cam.tenant_id = w.tenant_id and cam.kind = 'winback' || w.stage
    where w.message_sent_at is null
      and w.scheduled_send_at is not null
      and w.scheduled_send_at <= now()
      and w.claimed_at is null
      and w.expired_at is null
      and coalesce(w.voided, false) = false
    limit 50
  loop
    if r.opted_out then
      update public.winback_state set message_sent_at = now() where id = r.id;
      continue;
    end if;
    if r.webhook_url is null or r.webhook_url !~* '^https?://' then
      continue; -- no valid webhook yet; try again next run
    end if;

    v_offer_expires := now() + make_interval(days => coalesce(r.expiry_days, 5));

    perform net.http_post(
      url := r.webhook_url,
      body := jsonb_build_object(
        'name', r.name,
        'phone', private.to_e164_sa(r.phone),
        'phone_local', r.phone,
        'restaurant', r.restaurant,
        'campaign', r.campaign_name,
        'offer', r.offer_text,
        'days_left', coalesce(r.expiry_days, 5),
        'offer_expires', to_char(v_offer_expires, 'YYYY-MM-DD'),
        'stage', r.stage,
        'sent_at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );

    update public.winback_state
      set message_sent_at = now(), sent_at = now(), offer_expires_at = v_offer_expires
      where id = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function private.process_due_winbacks() from public, anon, authenticated;

-- Run every minute.
select cron.schedule('process-due-winbacks', '* * * * *', $$ select private.process_due_winbacks(); $$);
