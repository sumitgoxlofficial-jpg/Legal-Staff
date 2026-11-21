-- Minimal Supabase surroundings so the real migrations 0001, 0018, 0026, 0027, 0029, 0039-0044 can run on plain PostgreSQL 16.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('test.jwt', true), '')::jsonb $$;
create schema vault; create table vault.secrets (id uuid primary key default gen_random_uuid(), name text, description text, secret text, created_at timestamptz default now());
create view vault.decrypted_secrets as select id, name, secret as decrypted_secret, created_at from vault.secrets;
create function vault.create_secret(s text, n text, d text default '') returns uuid language sql as $$ insert into vault.secrets(name, secret, description) values (n, s, d) returning id $$;
create schema extensions;
create schema cron; create table cron.job (jobname text); create function cron.unschedule(n text) returns boolean language sql as $$ select true $$; create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ select 1::bigint $$;
create schema net; create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}') returns bigint language sql as $$ select 1::bigint $$;
create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]); create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid); alter table storage.objects enable row level security;
create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n, '/') $$;
grant usage on schema public, auth, extensions, vault to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
grant select on vault.decrypted_secrets to anon, authenticated, service_role;
-- Supabase gives anon/authenticated/service_role table rights by default; row level security is what restricts them.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
create extension if not exists pgcrypto with schema extensions;
