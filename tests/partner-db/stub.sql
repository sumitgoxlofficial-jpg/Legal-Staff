-- Minimal Supabase surroundings for migration 0024: roles, auth.uid()/jwt(), vault, extensions, the directory table (copied from 0001) and super_admins (0018).
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('test.jwt', true), '')::jsonb $$;
create schema vault; create table vault.secrets (id uuid primary key default gen_random_uuid(), name text, description text, secret text, created_at timestamptz default now());
create view vault.decrypted_secrets as select id, name, secret as decrypted_secret, created_at from vault.secrets;
create function vault.create_secret(s text, n text, d text default '') returns uuid language sql as $$ insert into vault.secrets(name, secret, description) values (n, s, d) returning id $$;
create schema extensions;
grant usage on schema public, auth, extensions, vault to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
grant select on vault.decrypted_secrets to anon, authenticated, service_role; grant execute on function vault.create_secret(text, text, text) to anon, authenticated, service_role;
create table public.super_admins (email text primary key check (email = lower(email)), added_at timestamptz not null default now());
alter table public.super_admins enable row level security;
insert into public.super_admins values ('owner@legalstaff.test');
create table public.directory_applications (
  id text primary key default ('LS-DIR-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 100000))::int::text, 5, '0')),
  name text not null check (length(trim(name)) between 2 and 120), enr text not null check (length(trim(enr)) between 3 and 40),
  council text not null, year text not null, city text not null, email text not null default '', mobile text not null default '',
  details jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'info', 'verified', 'rejected')),
  note text not null default '', created_at timestamptz not null default now(), decided_at timestamptz, decided_by uuid);
create unique index directory_enr_live_idx on public.directory_applications (upper(enr)) where status <> 'rejected';
alter table public.directory_applications enable row level security;
create policy dir_apply on public.directory_applications for insert to anon, authenticated with check (status = 'pending' and note = '' and decided_at is null and decided_by is null);
create policy dir_admin_update on public.directory_applications for update to authenticated using (true) with check (true);
grant insert on public.directory_applications to anon, authenticated; grant update on public.directory_applications to authenticated;
