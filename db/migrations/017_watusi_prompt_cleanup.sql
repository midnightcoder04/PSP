-- db/migrations/017_watusi_prompt_cleanup.sql
--
-- Migration 017: remove stale drag-and-drop copy from the WATUSI ranking
-- prompt now that the exercise is a read-only sorted listing.

BEGIN;

UPDATE public.exercises
   SET content_json = jsonb_set(
         content_json,
         '{prompt}',
         '"Your prefilled order below is derived from the checklist you just completed. The count beside each item is auto-calculated and read-only."'::jsonb
       )
 WHERE section_id = (SELECT id FROM public.sections WHERE slug = 'attitude')
   AND slug = 'attitude-types-watusi';

COMMIT;