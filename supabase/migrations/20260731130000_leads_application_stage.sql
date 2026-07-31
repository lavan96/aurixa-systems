-- Make Aurixa's own lead store joinable across the priority-access funnel.
--
-- `capture-lead` is the store of record for everything the site collects, and
-- it already receives all three stages: the Stage 1 application, and (from
-- this change onward) the Stage 2 questionnaire and the Stage 3 booking. What
-- it could not do was tell them apart or connect them — the public application
-- reference (`AX-XXXXXXXXXX`) that ties the three together was landing in the
-- untyped `metadata` blob and nowhere else.
--
-- Every column here is nullable or defaulted; existing rows are unaffected.

alter table public.leads
  add column if not exists application_id text,
  add column if not exists stage smallint not null default 1,
  add column if not exists submitted_at timestamptz;

comment on column public.leads.application_id is
  'Public application reference issued at Stage 1. The join key across Stage 1/2/3 and the Airtable operations record.';
comment on column public.leads.stage is
  '1 = priority access application, 2 = business readiness questionnaire, 3 = strategic review booking.';
comment on column public.leads.submitted_at is
  'When the visitor pressed submit, from the payload. `created_at` is when the row reached us.';

create index if not exists idx_leads_application_id
  on public.leads (application_id)
  where application_id is not null;

create index if not exists idx_leads_stage
  on public.leads (stage, created_at desc);

-- Backfill from the payloads we already stored. A row's whole submission body
-- is kept in `metadata`, so nothing has to be lost to the previous shape.
update public.leads
   set application_id = upper(metadata #>> '{applicationId}')
 where application_id is null
   and metadata #>> '{applicationId}' ~ '^[Aa][Xx]-[A-Za-z0-9]{10}$';

update public.leads
   set application_id = upper(metadata #>> '{applicationReference}')
 where application_id is null
   and metadata #>> '{applicationReference}' ~ '^[Aa][Xx]-[A-Za-z0-9]{10}$';

update public.leads
   set stage = case metadata #>> '{submissionType}'
                 when 'strategic_review_booking' then 3
                 when 'business_readiness_questionnaire' then 2
                 else 1
               end
 where metadata ? 'submissionType';

update public.leads
   set submitted_at = (metadata #>> '{submittedAt}')::timestamptz
 where submitted_at is null
   and metadata #>> '{submittedAt}' is not null
   -- A malformed timestamp in one row must not abort the backfill for the rest.
   and (metadata #>> '{submittedAt}') ~ '^\d{4}-\d{2}-\d{2}[T ]';
