-- Reconcile job: pull the Mission Control catalog into the mirror every 15
-- minutes as a safety net (the real-time path is an MC push webhook -> the
-- catalog-sync edge function). Uses the project's public anon key as the
-- function bearer — catalog-sync only mirrors public, non-PII product data,
-- and the anon key is a publishable credential.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'catalog-sync-reconcile',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://moeyytuduycrvvncdtme.supabase.co/functions/v1/catalog-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZXl5dHVkdXljcnZ2bmNkdG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjU0MjUsImV4cCI6MjA5OTYwMTQyNX0.gt65ttGRZJDRPuBlIkBP5RrJHHz1Mex94O62bKPdU8w'
    ),
    body := '{}'::jsonb
  );
  $$
);
