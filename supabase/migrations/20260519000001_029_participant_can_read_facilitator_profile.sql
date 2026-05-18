-- Migration 029: Allow participants to read their session facilitator's profile
--
-- The CourseHistoryPage nested join (enrollments → sessions → profiles) was
-- returning null for the facilitator because no RLS SELECT policy permitted a
-- participant to read a facilitator's profile row, causing "Facilitated by Unknown".
--
-- Uses a SECURITY DEFINER helper (consistent with migration 008 pattern) to
-- prevent recursive RLS evaluation across sessions/enrollments/profiles.

CREATE OR REPLACE FUNCTION public.participant_enrolled_with_facilitator(
  p_participant uuid,
  p_facilitator uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.enrollments e ON e.session_id = s.id
    WHERE s.facilitator_id = p_facilitator
      AND e.participant_id = p_participant
      AND e.is_active = true
  );
$$;

CREATE POLICY "profiles_select_own_facilitator" ON public.profiles
  FOR SELECT
  USING (
    role = 'facilitator'
    AND participant_enrolled_with_facilitator(auth.uid(), id)
  );
