-- Legal Staff — the Resend full-access key that upi-pay uses to read forwarded bank alert emails, kept in Vault.
-- Store or change it with:  select vault.create_secret('<key>', 'resend_read_key');  (or vault.update_secret)
create or replace function public.resend_read_key() returns text language sql security definer set search_path = '' as
$$ select decrypted_secret from vault.decrypted_secrets where name = 'resend_read_key' limit 1 $$;
revoke all on function public.resend_read_key() from public, anon, authenticated;
grant execute on function public.resend_read_key() to service_role;
