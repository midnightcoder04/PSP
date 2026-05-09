-- Migration 006: RPC functions for statistics and resume position

-- ── get_session_stats ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_session_stats(p_session_id uuid)
RETURNS TABLE (
  participant_id uuid,
  display_name   text,
  overall_pct    numeric,
  sections       jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only accessible by facilitator who owns the session, or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.sessions s WHERE s.id = p_session_id AND (
      s.facilitator_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    e.participant_id,
    pr.display_name,
    ROUND(
      100.0 * SUM(prog.completed_exercises) / NULLIF(SUM(prog.total_exercises), 0),
      1
    ) AS overall_pct,
    jsonb_agg(
      jsonb_build_object(
        'slug',         sec.slug,
        'completed',    prog.completed_exercises,
        'total',        prog.total_exercises,
        'completed_at', prog.section_completed_at
      ) ORDER BY sec.order_index
    ) AS sections
  FROM public.enrollments e
  JOIN public.profiles pr    ON pr.id = e.participant_id
  LEFT JOIN public.progress prog ON prog.participant_id = e.participant_id
                                AND prog.session_id = p_session_id
  LEFT JOIN public.sections sec  ON sec.id = prog.section_id
  WHERE e.session_id = p_session_id AND e.is_active = true
  GROUP BY e.participant_id, pr.display_name;
END;
$$;

-- ── get_admin_overview ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'total_sessions',          (SELECT COUNT(*) FROM public.sessions),
    'active_sessions',         (SELECT COUNT(*) FROM public.sessions WHERE is_active = true),
    'total_participants',      (SELECT COUNT(*) FROM public.profiles WHERE role = 'participant'),
    'overall_completion_pct',  (
      SELECT ROUND(
        100.0 * SUM(completed_exercises) / NULLIF(SUM(total_exercises), 0), 1
      ) FROM public.progress
    ),
    'sections', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'slug',               s.slug,
          'title',              s.title,
          'avg_completion_pct', ROUND(
            100.0 * AVG(
              CASE WHEN p.total_exercises > 0
                THEN p.completed_exercises::numeric / p.total_exercises
              END
            ), 1
          )
        ) ORDER BY s.order_index
      )
      FROM public.sections s
      LEFT JOIN public.progress p ON p.section_id = s.id
      GROUP BY s.id, s.slug, s.title, s.order_index
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ── get_resume_position ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_resume_position(
  p_participant_id uuid,
  p_session_id     uuid DEFAULT NULL
)
RETURNS TABLE (section_slug text, exercise_slug text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Users can only get their own resume position
  IF p_participant_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT sec.slug AS section_slug, ex.slug AS exercise_slug
  FROM public.progress prog
  JOIN public.sections  sec ON sec.id = prog.section_id
  JOIN public.exercises ex  ON ex.id  = prog.last_exercise_id
  WHERE prog.participant_id = p_participant_id
    AND (
      (p_session_id IS NULL AND prog.session_id IS NULL)
      OR prog.session_id = p_session_id
    )
    AND prog.section_completed_at IS NULL
  ORDER BY sec.order_index ASC
  LIMIT 1;
END;
$$;
