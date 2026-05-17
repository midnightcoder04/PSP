-- Migration 009: fix migration 006's get_admin_overview.
--
-- The original definition nested AVG() inside jsonb_agg(jsonb_build_object(...)),
-- which Postgres rejects with "aggregate function calls cannot be nested" at
-- query time. The fix computes the per-section AVG in a derived table first,
-- then aggregates the resulting flat rows.

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
          'slug',               t.slug,
          'title',              t.title,
          'avg_completion_pct', t.avg_completion_pct
        )
        ORDER BY t.order_index
      )
      FROM (
        SELECT
          s.slug,
          s.title,
          s.order_index,
          ROUND(
            100.0 * AVG(
              CASE WHEN p.total_exercises > 0
                THEN p.completed_exercises::numeric / p.total_exercises
              END
            ), 1
          ) AS avg_completion_pct
        FROM public.sections s
        LEFT JOIN public.progress p ON p.section_id = s.id
        GROUP BY s.slug, s.title, s.order_index
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
