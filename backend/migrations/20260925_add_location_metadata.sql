-- Apply once to an existing CivicMind Supabase project.
alter table public.issues
  add column if not exists location_accuracy_meters double precision,
  add column if not exists location_source text not null default 'gps',
  add column if not exists address text;

alter table public.issues
  drop constraint if exists issues_location_accuracy_nonnegative,
  add constraint issues_location_accuracy_nonnegative
    check (location_accuracy_meters is null or location_accuracy_meters >= 0),
  drop constraint if exists issues_location_source_valid,
  add constraint issues_location_source_valid
    check (location_source in ('gps', 'manual'));

-- Existing rows may not have a location, so latitude/longitude remain nullable in
-- the live project. The API requires both coordinates for every new submission.
