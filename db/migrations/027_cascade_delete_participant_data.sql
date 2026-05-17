-- Migration 027: Add ON DELETE CASCADE to progress and responses participant FKs.
-- Without this, deleting a profile (via auth.admin.deleteUser) was blocked by
-- these constraints, causing 500 errors from the delete-user Edge Function.

ALTER TABLE public.progress
  DROP CONSTRAINT progress_participant_id_fkey,
  ADD CONSTRAINT progress_participant_id_fkey
    FOREIGN KEY (participant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.responses
  DROP CONSTRAINT responses_participant_id_fkey,
  ADD CONSTRAINT responses_participant_id_fkey
    FOREIGN KEY (participant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
