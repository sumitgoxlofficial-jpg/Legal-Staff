-- Razorpay keys may be kept in Vault ('razorpay_key_id', 'razorpay_key_secret', optional 'razorpay_webhook_secret')
-- when they are not set as function secrets. Only the payment Edge Functions (service role) can read them.
-- The keys are NOT in this file: store them with select vault.create_secret('<value>', '<name>'); — never commit them.
create or replace function public.razorpay_keys() returns table (key_id text, key_secret text, webhook_secret text)
language sql security definer set search_path = '' as $$
  select (select decrypted_secret from vault.decrypted_secrets where name = 'razorpay_key_id'),
         (select decrypted_secret from vault.decrypted_secrets where name = 'razorpay_key_secret'),
         (select decrypted_secret from vault.decrypted_secrets where name = 'razorpay_webhook_secret');
$$;
revoke all on function public.razorpay_keys() from public, anon, authenticated;
grant execute on function public.razorpay_keys() to service_role;
