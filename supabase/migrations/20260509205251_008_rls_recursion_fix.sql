-- Migration 008: break RLS recursion in profiles/sessions/enrollments by
-- moving the cross-table checks into SECURITY DEFINER helpers.
--
-- The original policies in 005 inlined `EXISTS (SELECT … FROM other_rls_table)`
-- which triggered Postgres's "infinite recursion detected in policy" check at
-- query time once a user was authenticated. (For example, the `profiles_select_facilitator`
-- policy on `profiles` queried `enrollments`, whose own policy queried `sessions`,
-- whose policy queried back into `enrollments` — Postgres rejects the loop.)
--
-- The helpers below run with the function owner's privileges (postgres) so the
-- inner SELECTs bypass RLS. Each one returns only a boolean about specific IDs,
-- so they do not leak data; callers can only learn what they asked about.

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = uid AND p.role = 'admin' AND p.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.facilitates_session(uid uuid, sid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions s WHERE s.id = sid AND s.facilitator_id = uid
  );
$$;

CREATE OR REPLACE FUNCTION public.participant_in_session(uid uuid, sid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
     WHERE e.session_id = sid AND e.participant_id = uid AND e.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.facilitator_has_participant(uid uuid, pid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.enrollments e
      JOIN public.sessions    s ON s.id = e.session_id
     WHERE e.participant_id = pid
       AND s.facilitator_id = uid
       AND e.is_active = true
  );
$$;

-- Allow signed-in users to call the helpers (anon does not need them).
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid)                          TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_active_user(uuid)                    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.facilitates_session(uuid, uuid)         TO authenticated;
GRANT  EXECUTE ON FUNCTION public.participant_in_session(uuid, uuid)      TO authenticated;
GRANT  EXECUTE ON FUNCTION public.facilitator_has_participant(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid)                          FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_active_user(uuid)                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.facilitates_session(uuid, uuid)         FROM anon;
REVOKE EXECUTE ON FUNCTION public.participant_in_session(uuid, uuid)      FROM anon;
REVOKE EXECUTE ON FUNCTION public.facilitator_has_participant(uuid, uuid) FROM anon;

-- ── profiles ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS profiles_select_own         ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin       ON public.profiles;
DROP POLICY IF EXISTS profiles_select_facilitator ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own         ON public.profiles;
DROP POLICY IF EXISTS profiles_update_admin       ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT
  USING (id = auth.uid());
CREATE POLICY profiles_select_admin ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));
CREATE POLICY profiles_select_facilitator ON public.profiles FOR SELECT
  USING (public.facilitator_has_participant(auth.uid(), id));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- ── sessions ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS sessions_select_admin       ON public.sessions;
DROP POLICY IF EXISTS sessions_select_facilitator ON public.sessions;
DROP POLICY IF EXISTS sessions_select_participant ON public.sessions;
DROP POLICY IF EXISTS sessions_all_admin          ON public.sessions;

CREATE POLICY sessions_select_admin ON public.sessions FOR SELECT
  USING (public.is_admin(auth.uid()));
CREATE POLICY sessions_select_facilitator ON public.sessions FOR SELECT
  USING (facilitator_id = auth.uid());
CREATE POLICY sessions_select_participant ON public.sessions FOR SELECT
  USING (public.participant_in_session(auth.uid(), id));
CREATE POLICY sessions_all_admin ON public.sessions FOR ALL
  USING (public.is_admin(auth.uid()));

-- ── enrollments ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS enrollments_select_admin       ON public.enrollments;
DROP POLICY IF EXISTS enrollments_select_facilitator ON public.enrollments;
DROP POLICY IF EXISTS enrollments_select_own         ON public.enrollments;
DROP POLICY IF EXISTS enrollments_all_admin          ON public.enrollments;

CREATE POLICY enrollments_select_admin ON public.enrollments FOR SELECT
  USING (public.is_admin(auth.uid()));
CREATE POLICY enrollments_select_facilitator ON public.enrollments FOR SELECT
  USING (public.facilitates_session(auth.uid(), session_id));
CREATE POLICY enrollments_select_own ON public.enrollments FOR SELECT
  USING (participant_id = auth.uid());
CREATE POLICY enrollments_all_admin ON public.enrollments FOR ALL
  USING (public.is_admin(auth.uid()));

-- ── sections / exercises ────────────────────────────────────────────────────
DROP POLICY IF EXISTS sections_select_authenticated  ON public.sections;
DROP POLICY IF EXISTS exercises_select_authenticated ON public.exercises;

CREATE POLICY sections_select_authenticated  ON public.sections  FOR SELECT
  USING (public.is_active_user(auth.uid()));
CREATE POLICY exercises_select_authenticated ON public.exercises FOR SELECT
  USING (public.is_active_user(auth.uid()));

-- ── responses ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS responses_select_own         ON public.responses;
DROP POLICY IF EXISTS responses_select_facilitator ON public.responses;
DROP POLICY IF EXISTS responses_select_admin       ON public.responses;
DROP POLICY IF EXISTS responses_insert_own         ON public.responses;
DROP POLICY IF EXISTS responses_update_own         ON public.responses;

CREATE POLICY responses_select_own ON public.responses FOR SELECT
  USING (participant_id = auth.uid());
CREATE POLICY responses_select_facilitator ON public.responses FOR SELECT
  USING (public.facilitator_has_participant(auth.uid(), participant_id));
CREATE POLICY responses_select_admin ON public.responses FOR SELECT
  USING (public.is_admin(auth.uid()));
CREATE POLICY responses_insert_own ON public.responses FOR INSERT
  WITH CHECK (participant_id = auth.uid());
CREATE POLICY responses_update_own ON public.responses FOR UPDATE
  USING (participant_id = auth.uid()) WITH CHECK (participant_id = auth.uid());

-- ── progress ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS progress_select_own         ON public.progress;
DROP POLICY IF EXISTS progress_select_facilitator ON public.progress;
DROP POLICY IF EXISTS progress_select_admin       ON public.progress;

CREATE POLICY progress_select_own ON public.progress FOR SELECT
  USING (participant_id = auth.uid());
CREATE POLICY progress_select_facilitator ON public.progress FOR SELECT
  USING (public.facilitator_has_participant(auth.uid(), participant_id));
CREATE POLICY progress_select_admin ON public.progress FOR SELECT
  USING (public.is_admin(auth.uid()));
