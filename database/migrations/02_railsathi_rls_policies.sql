-- ============================================================================
-- RailSathi (Smart Rail AI) - Centralized Supabase Master RLS Policies
-- Migration 02: Strict Row Level Security Policies for All Tables
-- ============================================================================

-- 1. Enable RLS on ALL Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.train_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.train_live_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_vibration_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_progressive_risk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crowd_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.railway_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can read own profile or admins read all" ON public.profiles;
CREATE POLICY "Users can read own profile or admins read all"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own non-sensitive profile fields" ON public.profiles;
CREATE POLICY "Users can update own non-sensitive profile fields"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth_user_id = auth.uid() OR public.is_admin())
    WITH CHECK (
        public.is_admin() OR (
            auth_user_id = auth.uid()
            -- Prevent normal users from altering role or verification status on update
            AND role = (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid())
            AND phone_verified = (SELECT phone_verified FROM public.profiles WHERE auth_user_id = auth.uid())
            AND email_verified = (SELECT email_verified FROM public.profiles WHERE auth_user_id = auth.uid())
        )
    );

-- ============================================================================
-- PHONE VERIFICATIONS TABLE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own phone verification state" ON public.phone_verifications;
CREATE POLICY "Users can view own phone verification state"
    ON public.phone_verifications FOR SELECT
    TO authenticated
    USING (
        user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
        OR public.is_admin()
    );

-- ============================================================================
-- ADMIN AUDIT LOGS TABLE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.admin_audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can create audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can create audit logs"
    ON public.admin_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- ============================================================================
-- DOMAIN TABLES PUBLIC READ & ADMIN WRITE POLICIES
-- ============================================================================

-- Macro for domain tables: Stations
DROP POLICY IF EXISTS "Public read stations" ON public.stations;
CREATE POLICY "Public read stations" ON public.stations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin write stations" ON public.stations;
CREATE POLICY "Admin write stations" ON public.stations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Trains
DROP POLICY IF EXISTS "Public read trains" ON public.trains;
CREATE POLICY "Public read trains" ON public.trains FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin write trains" ON public.trains;
CREATE POLICY "Admin write trains" ON public.trains FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Train Schedules
DROP POLICY IF EXISTS "Public read train_schedules" ON public.train_schedules;
CREATE POLICY "Public read train_schedules" ON public.train_schedules FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin write train_schedules" ON public.train_schedules;
CREATE POLICY "Admin write train_schedules" ON public.train_schedules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Live Train State
DROP POLICY IF EXISTS "Public read train_live_state" ON public.train_live_state;
CREATE POLICY "Public read train_live_state" ON public.train_live_state FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin write train_live_state" ON public.train_live_state;
CREATE POLICY "Admin write train_live_state" ON public.train_live_state FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Track Sections
DROP POLICY IF EXISTS "Public read track_sections" ON public.track_sections;
CREATE POLICY "Public read track_sections" ON public.track_sections FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin write track_sections" ON public.track_sections;
CREATE POLICY "Admin write track_sections" ON public.track_sections FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Track Vibration Telemetry
DROP POLICY IF EXISTS "Public read track_vibration_telemetry" ON public.track_vibration_telemetry;
CREATE POLICY "Public read track_vibration_telemetry" ON public.track_vibration_telemetry FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin write track_vibration_telemetry" ON public.track_vibration_telemetry;
CREATE POLICY "Admin write track_vibration_telemetry" ON public.track_vibration_telemetry FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Track Progressive Risk
DROP POLICY IF EXISTS "Public read track_progressive_risk" ON public.track_progressive_risk;
CREATE POLICY "Public read track_progressive_risk" ON public.track_progressive_risk FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin write track_progressive_risk" ON public.track_progressive_risk;
CREATE POLICY "Admin write track_progressive_risk" ON public.track_progressive_risk FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Crowd Observations
DROP POLICY IF EXISTS "Public read crowd_observations" ON public.crowd_observations;
CREATE POLICY "Public read crowd_observations" ON public.crowd_observations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin write crowd_observations" ON public.crowd_observations;
CREATE POLICY "Admin write crowd_observations" ON public.crowd_observations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Railway Alerts
DROP POLICY IF EXISTS "Public read railway_alerts" ON public.railway_alerts;
CREATE POLICY "Public read railway_alerts" ON public.railway_alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin write railway_alerts" ON public.railway_alerts;
CREATE POLICY "Admin write railway_alerts" ON public.railway_alerts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
