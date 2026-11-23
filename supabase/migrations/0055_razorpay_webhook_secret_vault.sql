-- The Razorpay webhook secret may be kept in Vault (secret name 'razorpay_webhook_secret') instead of an Edge Function secret.
-- Set it with:  select vault.create_secret('<the same secret you typed in Razorpay>', 'razorpay_webhook_secret');
create or replace function public.razorpay_webhook_secret() returns text
language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'razorpay_webhook_secret' limit 1;
$$;
revoke all on function public.razorpay_webhook_secret() from public, anon, authenticated;
grant execute on function public.razorpay_webhook_secret() to service_role;
