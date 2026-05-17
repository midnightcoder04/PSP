-- Migration 005: Row Level Security policies for all tables

-- ── profiles ────────────────────────────────────────────────────────────────
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_select_admin ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY profiles_select_facilitator ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.sessions s ON s.id = e.session_id
    WHERE e.participant_id = profiles.id
      AND s.facilitator_id = auth.uid()
      AND e.is_active = true
  ));

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- ── sessions ─────────────────────────────────────────────────────────────────
CREATE POLICY sessions_select_admin ON public.sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY sessions_select_facilitator ON public.sessions FOR SELECT
  USING (facilitator_id = auth.uid());

CREATE POLICY sessions_select_participant ON public.sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.session_id = sessions.id
      AND e.participant_id = auth.uid()
      AND e.is_active = true
  ));

CREATE POLICY sessions_all_admin ON public.sessions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- ── enrollments ──────────────────────────────────────────────────────────────
CREATE POLICY enrollments_select_admin ON public.enrollments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY enrollments_select_facilitator ON public.enrollments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = enrollments.session_id AND s.facilitator_id = auth.uid()
  ));

CREATE POLICY enrollments_select_own ON public.enrollments FOR SELECT
  USING (participant_id = auth.uid());

CREATE POLICY enrollments_all_admin ON public.enrollments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- ── sections ─────────────────────────────────────────────────────────────────
CREATE POLICY sections_select_authenticated ON public.sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true
  ));

-- ── exercises ────────────────────────────────────────────────────────────────
CREATE POLICY exercises_select_authenticated ON public.exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true
  ));

-- ── responses ────────────────────────────────────────────────────────────────
CREATE POLICY responses_select_own ON public.responses FOR SELECT
  USING (participant_id = auth.uid());

CREATE POLICY responses_select_facilitator ON public.responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.enrollments e ON e.session_id = s.id
    WHERE s.facilitator_id = auth.uid()
      AND e.participant_id = responses.participant_id
      AND e.is_active = true
  ));

CREATE POLICY responses_select_admin ON public.responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY responses_insert_own ON public.responses FOR INSERT
  WITH CHECK (participant_id = auth.uid());

CREATE POLICY responses_update_own ON public.responses FOR UPDATE
  USING (participant_id = auth.uid())
  WITH CHECK (participant_id = auth.uid());

-- ── progress ─────────────────────────────────────────────────────────────────
CREATE POLICY progress_select_own ON public.progress FOR SELECT
  USING (participant_id = auth.uid());

CREATE POLICY progress_select_facilitator ON public.progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.enrollments e ON e.session_id = s.id
    WHERE s.facilitator_id = auth.uid()
      AND e.participant_id = progress.participant_id
      AND e.is_active = true
  ));

CREATE POLICY progress_select_admin ON public.progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));
