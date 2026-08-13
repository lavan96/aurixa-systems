-- Trackability: assistant telemetry carries the workspace and user the
-- portal brought over from the dashboard, so a conversation can be tied to
-- the tenant it came from — locally here, and in Mission Control via the
-- assistant-activity forward the edge function now sends per ask.

alter table public.support_assistant_logs
  add column if not exists workspace_id text,
  add column if not exists user_external_id text;

comment on column public.support_assistant_logs.workspace_id is
  'Workspace identifier the portal carried from the dashboard (clone slug / tenant ref / prime billing uid). Best-effort, unauthenticated.';
comment on column public.support_assistant_logs.user_external_id is
  'Dashboard user id as supplied by the portal URL. Best-effort, unauthenticated.';

create index if not exists support_assistant_logs_workspace_idx
  on public.support_assistant_logs (workspace_id, created_at desc)
  where workspace_id is not null;
