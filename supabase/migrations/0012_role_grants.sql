-- Table privileges for the PostgREST roles.
--
-- Hosted Supabase grants these automatically to anything created through its
-- SQL editor, so the migrations above never had to mention them -- and a
-- database built from those files alone (a local stack, a fresh project, a
-- restore) came up with tables nobody could read. This makes the schema
-- self-contained instead of depending on where it happens to be applied.
--
-- These are privileges, not permissions: `anon` still only sees what a row
-- level security policy lets it see, and every table here has RLS enabled.
-- The grants deliberately mirror what the hosted project already has, so a
-- local database behaves like production rather than better than it.
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

-- Same treatment for whatever the next migration adds.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
