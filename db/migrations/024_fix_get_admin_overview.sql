-- Migration 024: fix get_admin_overview — nested aggregate + numeric string issues.
--
-- The original sections subquery used jsonb_agg(jsonb_build_object(...AVG()...))
-- which is a nested aggregate and throws "aggregate function calls cannot be
-- nested". The sections chart has never rendered. Fix by computing per-section
-- averages in a CTE first, then aggregating into JSON.

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

  WITH section_avgs AS (
    SELECT
      s.id,
      s.slug,
      s.title,
      s.order_index,
      ROUND(
        100.0 * AVG(
          CASE WHEN p.total_exercises > 0
            THEN p.completed_exercises::numeric / p.total_exercises
          END
        ), 1
      ) AS avg_pct
    FROM   public.sections s
    LEFT JOIN public.progress p ON p.section_id = s.id
    GROUP  BY s.id, s.slug, s.title, s.order_index
  )
  SELECT jsonb_build_object(
    'total_sessions',         (SELECT COUNT(*)  FROM public.sessions),
    'active_sessions',        (SELECT COUNT(*)  FROM public.sessions  WHERE is_active = true),
    'total_participants',     (SELECT COUNT(*)  FROM public.profiles  WHERE role = 'participant'),
    'overall_completion_pct', (
      SELECT ROUND(
        100.0 * SUM(completed_exercises) / NULLIF(SUM(total_exercises), 0), 1
      ) FROM public.progress
    ),
    'sections', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'slug',               slug,
          'title',              title,
          'avg_completion_pct', COALESCE(avg_pct, 0)
        ) ORDER BY order_index
      )
      FROM section_avgs
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
