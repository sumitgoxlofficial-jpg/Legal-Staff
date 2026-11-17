-- Legal Staff — AI (functions/ai, Groq). The Groq key is NOT in this file: set the GROQ_API_KEY function secret, or
-- store it in Vault as 'groq_api_key' (select vault.create_secret('<key>', 'groq_api_key');) — never commit it.
create or replace function public.groq_api_key() returns text
language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'groq_api_key';
$$;
revoke all on function public.groq_api_key() from public, anon, authenticated;
grant execute on function public.groq_api_key() to service_role;

-- AI credits used per firm per IST month (Solo 200, Professional 1,000, Firm 5,000; enforced in functions/ai).
create table if not exists public.ai_usage (
  firm_id uuid not null references public.firms(id) on delete cascade,
  month text not null,                      -- IST month, YYYY-MM
  used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (firm_id, month)
);
alter table public.ai_usage enable row level security;
drop policy if exists ai_usage_select on public.ai_usage;
create policy ai_usage_select on public.ai_usage for select to authenticated using (public.is_member(firm_id));

-- Counts one credit if the firm is under its monthly limit; returns the new total, or null when the limit is reached.
create or replace function public.ai_take_credit(f uuid, p_month text, p_limit integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.ai_usage (firm_id, month, used) values (f, p_month, 0) on conflict do nothing;
  update public.ai_usage set used = used + 1, updated_at = now() where firm_id = f and month = p_month and used < p_limit returning used into n;
  return n;
end $$;
-- Gives back a credit when the AI service failed to answer.
create or replace function public.ai_refund_credit(f uuid, p_month text) returns void
language sql security definer set search_path = '' as $$
  update public.ai_usage set used = greatest(used - 1, 0), updated_at = now() where firm_id = f and month = p_month;
$$;
revoke all on function public.ai_take_credit(uuid, text, integer), public.ai_refund_credit(uuid, text) from public, anon, authenticated;
grant execute on function public.ai_take_credit(uuid, text, integer), public.ai_refund_credit(uuid, text) to service_role;
