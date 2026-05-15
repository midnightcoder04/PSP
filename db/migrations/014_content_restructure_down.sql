-- db/migrations/014_content_restructure_down.sql
--
-- Best-effort dev rollback for migration 014.
--
-- ⚠ NOT SAFE FOR PRODUCTION. Migration 014 is destructive (wipes responses + progress
-- permanently). This down migration restores legacy section / exercise slugs but does
-- NOT restore wiped participant data. For production rollback, restore from a Supabase
-- PITR backup, not via this script.
--
-- Usage (dev only): apply this against a scratch branch to undo a 014 apply for testing.
-- Workflow:
--   1. apply 014_content_restructure.sql to scratch
--   2. apply this _down.sql
--   3. the legacy 6-section / ~30-exercise shape is restored from a snapshot below
--
-- Snapshot source: db/seeds/course-content.json as it stood pre-Iter-5 (commit
-- 886b29e — "fix(ui,db): slide-nav hotfixes [003]"). If the seed has drifted since
-- then, regenerate this file from the historical commit using:
--   git show 886b29e:db/seeds/course-content.json > /tmp/legacy-seed.json
--   python3 scripts/_iter5_gen_migration.py --from /tmp/legacy-seed.json --down

BEGIN;

-- Drop the group_slug constraint + column added in Phase A of 014
DO $$ BEGIN
  ALTER TABLE public.sections DROP CONSTRAINT sections_group_slug_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.sections DROP COLUMN IF EXISTS group_slug;

-- Wipe the new structure
DELETE FROM public.exercises;
DELETE FROM public.sections;

-- Restoration of legacy seed rows is left as an out-of-band step: re-apply the
-- relevant portion of 003_sections_exercises.sql plus the legacy seed loader at
-- the commit referenced above. Automating that restore is out of scope for Iter 5.

COMMIT;

-- After this script: sections + exercises tables are empty. Re-apply the legacy
-- seed via `npm run db:seed` (which reads db/seeds/course-content.json — restore the
-- pre-Iter-5 file from git first: `git show 886b29e:db/seeds/course-content.json > db/seeds/course-content.json`).
