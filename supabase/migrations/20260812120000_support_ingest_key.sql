-- Vault-backed signing key for the Mission Control support-ticket ingest.
--
-- The support-ticket edge function signs each forwarded ticket with
-- HMAC-SHA256 (x-support-signature) so Mission Control can verify where a
-- submission came from. The key itself lives in Vault under the name
-- `support_ingest_key`, inserted by operations with
--   select vault.create_secret('<key>', 'support_ingest_key');
-- and NEVER in a migration — migrations are committed to git. This file
-- only installs the reader the edge function calls, locked to the service
-- role so no browser-visible credential can ever reach it.

create or replace function public.support_ingest_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'support_ingest_key'
  order by created_at desc
  limit 1
$$;

comment on function public.support_ingest_key() is
  'Mission Control ingest signing key, read from Vault (support_ingest_key). Service role only.';

revoke all on function public.support_ingest_key() from public;
revoke all on function public.support_ingest_key() from anon;
revoke all on function public.support_ingest_key() from authenticated;
grant execute on function public.support_ingest_key() to service_role;
