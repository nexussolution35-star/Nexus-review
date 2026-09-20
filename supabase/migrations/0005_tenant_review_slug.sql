-- Restaurant-level review link, replacing per-waiter QR slugs.
alter table public.tenants add column if not exists review_slug text unique;

update public.tenants
set review_slug = 'r-' || left(replace(id::text, '-', ''), 10)
where review_slug is null;
