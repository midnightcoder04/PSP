-- Migration 035: presenter live-responses RPC + realtime on responses
--
-- get_session_live_responses feeds the presentation-mode responses panel.
-- Gate: admins, or the session's own facilitator when they hold presenter
-- access (profiles.can_present, migration 033). The generic
-- responses_select_facilitator RLS policy deliberately stays untouched.

CREATE OR REPLACE FUNCTION public.get_session_live_responses(
  p_session_id     uuid,
  p_exercise_slugs text[]
)
RETURNS TABLE (
  participant_id uuid,
  display_name   text,
  exercise_slug  text,
  exercise_type  text,
  response_json  jsonb,
  is_complete    boolean,
  updated_at     timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_admin(auth.uid())
    OR (
      public.facilitates_session(auth.uid(), p_session_id)
      AND public.has_presenter_access(auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Participant saves currently write session_id = NULL (SectionPage /
  -- useExerciseSave), so rows are scoped via active enrollments rather than a
  -- responses.session_id filter. The lateral picks the newest response per
  -- (participant, exercise) and prefers a session-scoped row should writers
  -- ever start stamping session_id. LEFT JOIN keeps enrolled-but-unanswered
  -- participants visible so the panel can show "N of M answered".
  RETURN QUERY
  SELECT
    e.participant_id,
    pr.display_name,
    ex.slug AS exercise_slug,
    ex.type AS exercise_type,
    r.response_json,
    r.is_complete,
    r.updated_at
  FROM public.enrollments e
  JOIN public.profiles pr ON pr.id = e.participant_id
  CROSS JOIN public.exercises ex
  LEFT JOIN LATERAL (
    SELECT r0.response_json, r0.is_complete, r0.updated_at
    FROM public.responses r0
    WHERE r0.participant_id = e.participant_id
      AND r0.exercise_id = ex.id
      AND (r0.session_id = p_session_id OR r0.session_id IS NULL)
    ORDER BY (r0.session_id = p_session_id) DESC NULLS LAST, r0.updated_at DESC
    LIMIT 1
  ) r ON true
  WHERE e.session_id = p_session_id
    AND e.is_active = true
    AND ex.slug = ANY (p_exercise_slugs)
  ORDER BY pr.display_name, ex.slug;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_session_live_responses(uuid, text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_session_live_responses(uuid, text[]) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_session_live_responses(uuid, text[]) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_session_live_responses(uuid, text[]) TO service_role;

-- Realtime: the presenter subscribes to postgres_changes on responses purely
-- as a refetch trigger (payloads are never rendered; RLS scopes event
-- delivery). Idempotent so re-running the migration is safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'responses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;
  END IF;
END $$;
