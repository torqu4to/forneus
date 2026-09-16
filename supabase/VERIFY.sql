-- Paste this after 001_profiles.sql and check the output.
-- It proves the table is actually protected rather than assuming it is.

-- 1. RLS must be ON. If rls_enabled is false, stop: the table is public.
select relname as table_name,
       relrowsecurity as rls_enabled,
       relforcerowsecurity as rls_forced
from pg_class
where oid = 'public.profiles'::regclass;

-- 2. Exactly four policies, one per verb.
select cmd as verb, policyname
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by cmd;

-- 3. Signed out, the table must look empty — not error, just empty.
--    (The SQL Editor runs as an admin, so use the browser console instead:
--     await supabase.from('profiles').select('*')  →  { data: [], error: null })
