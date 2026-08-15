-- Migration 041: Add phone number to profiles.
--
-- Nullable — existing admin/facilitator/participant rows have no phone
-- value; it is required only at the InvitePage form/UI level for new
-- participant self-registrations, not enforced at the DB level.

ALTER TABLE public.profiles ADD COLUMN phone text;
