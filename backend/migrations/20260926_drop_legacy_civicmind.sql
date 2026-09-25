-- Run only after the VANTA migration has completed successfully.
-- This permanently removes the retired CivicMind database objects.

drop table if exists public.status_events cascade;
drop table if exists public.issue_duplicates cascade;
drop table if exists public.issues cascade;
drop table if exists public.departments cascade;

delete from storage.objects
where bucket_id in ('issue-images', 'cctv-frames');

delete from storage.buckets
where id in ('issue-images', 'cctv-frames');
