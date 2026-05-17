-- Migration 023: rewrite get_session_stats to always return all sections.
--
-- Previous version LEFT JOINed only on progress rows, so participants with
-- no progress (or progress saved under session_id = NULL, which is the case
-- while SectionPage uses sessionId = null) got sections = [{slug: null, ...}],
-- crashing the detail page on slug.charAt(0).
--
-- Fixes:
-- 1. CROSS JOIN sections so every participant row always has all 9 sections.
-- 2. Compute section totals from exercises (type != 'info') rather than from
--    stale progress.total_exercises.
-- 3. Fall back to session_id IS NULL progress when no session-specific rows
--    exist (covers the "sessions not yet wired up" development period).

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
  IF NOT EXISTS (
    SELECT 1 FROM public.sessions s WHERE s.id = p_session_id AND (
      s.facilitator_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH section_totals AS (
    SELECT sec.id   AS section_id,
           sec.slug,
           sec.order_index,
           COUNT(ex.id)::int AS total_ex
    FROM   public.sections sec
    LEFT JOIN public.exercises ex
           ON ex.section_id = sec.id AND ex.type != 'info'
    GROUP  BY sec.id, sec.slug, sec.order_index
  ),
  best_progress AS (
    -- Per participant × section, prefer session-specific progress; fall back
    -- to session_id IS NULL so the facilitator view is useful while sessions
    -- are not yet wired up on the participant side.
    SELECT DISTINCT ON (prog.participant_id, prog.section_id)
           prog.participant_id,
           prog.section_id,
           prog.completed_exercises,
           prog.section_completed_at
    FROM   public.progress prog
    WHERE  prog.session_id = p_session_id
        OR prog.session_id IS NULL
    ORDER  BY prog.participant_id,
              prog.section_id,
              (prog.session_id = p_session_id) DESC NULLS LAST
  )
  SELECT
    e.participant_id,
    pr.display_name,
    ROUND(
      100.0 * COALESCE(SUM(bp.completed_exercises), 0) /
      NULLIF(SUM(st.total_ex), 0),
      1
    ) AS overall_pct,
    jsonb_agg(
      jsonb_build_object(
        'slug',         st.slug,
        'completed',    COALESCE(bp.completed_exercises, 0),
        'total',        st.total_ex,
        'completed_at', bp.section_completed_at
      ) ORDER BY st.order_index
    ) AS sections
  FROM   public.enrollments e
  JOIN   public.profiles pr   ON pr.id = e.participant_id
  CROSS  JOIN section_totals st
  LEFT   JOIN best_progress bp
           ON bp.participant_id = e.participant_id
          AND bp.section_id     = st.section_id
  WHERE  e.session_id = p_session_id
    AND  e.is_active  = true
  GROUP  BY e.participant_id, pr.display_name;
END;
$$;
