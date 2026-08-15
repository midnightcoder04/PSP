-- Migration 042: Add must_reset_password to profiles.
--
-- Set to true when an admin/facilitator creates an account with a temp
-- password (bulk-create-users, create-user) so the invitee is forced
-- through the password-reset page (which also collects phone, if missing)
-- on their first authenticated navigation. Self-registered accounts
-- (claim-invite) leave this false — they already chose their own password
-- and phone at signup. Defaults false, so existing rows are unaffected.

ALTER TABLE public.profiles ADD COLUMN must_reset_password boolean NOT NULL DEFAULT false;
