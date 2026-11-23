-- 0051: one site-wide banner an administrator can switch on (maintenance notice, offer, news), with optional start and end dates.
-- The table has row level security and no policies: nobody reads or writes it directly. Everyone reads the live banner through
-- site_banner() (plain text only, the screens never treat it as HTML); only the admin function (service role) writes it.
create table if not exists public.site_banner (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  message text not null default '' check (char_length(message) <= 300),
  tone text not null default 'info' check (tone in ('info', 'warning', 'success')),
  link_url text not null default '' check (link_url = '' or link_url ~* '^https://[^\s]+$'),
  link_text text not null default '' check (char_length(link_text) <= 40),
  starts_on date,
  ends_on date,
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
alter table public.site_banner enable row level security;
insert into public.site_banner (id) values (1) on conflict do nothing;

create or replace function public.site_banner() returns jsonb language sql stable security definer set search_path = '' as $$
  select case when b.enabled and btrim(b.message) <> ''
               and (b.starts_on is null or b.starts_on <= (now() at time zone 'Asia/Kolkata')::date)
               and (b.ends_on is null or b.ends_on >= (now() at time zone 'Asia/Kolkata')::date)
              then jsonb_build_object('message', b.message, 'tone', b.tone, 'link_url', b.link_url, 'link_text', b.link_text)
              else null end
  from public.site_banner b where b.id = 1
$$;
revoke execute on function public.site_banner() from public;
grant execute on function public.site_banner() to anon, authenticated, service_role;
