-- ============================================================================
-- RailSathi (Smart Rail AI) - Centralized Supabase Master PostgreSQL Schema
-- Migration 01: Core Extensions, Master Tables, Triggers & Helper Functions
-- ============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Master Profiles Table (Linked securely to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL DEFAULT 'Rail Passenger',
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(30),
    avatar_url TEXT,
    role VARCHAR(30) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'support', 'operator')),
    phone_verified BOOLEAN NOT NULL DEFAULT false,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Phone Verification State Machine Table
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    phone_number VARCHAR(30) NOT NULL,
    provider VARCHAR(30) NOT NULL DEFAULT 'TRUECALLER' CHECK (provider IN ('TRUECALLER', 'SMS', 'FIREBASE')),
    status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED', 'EXPIRED')),
    verification_payload JSONB DEFAULT '{}'::jsonb,
    attempts INT DEFAULT 0,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Admin Audit Logs Table (Administrative Traceability & Security)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Stations Master Table (PostGIS Enabled)
CREATE TABLE IF NOT EXISTS public.stations (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zone VARCHAR(10) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    platforms_count INT DEFAULT 8,
    is_junction BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stations_geom ON public.stations USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_stations_code ON public.stations(code);

-- 6. Trains Master Table
CREATE TABLE IF NOT EXISTS public.trains (
    train_number VARCHAR(10) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL, -- Suburban EMU Local
    source_code VARCHAR(10) REFERENCES public.stations(code),
    destination_code VARCHAR(10) REFERENCES public.stations(code),
    total_distance_km DOUBLE PRECISION NOT NULL,
    average_speed_kmh DOUBLE PRECISION NOT NULL,
    runs_on VARCHAR(50) DEFAULT 'DAILY',
    rakes_count INT DEFAULT 12,
    coach_composition JSONB DEFAULT '["C1","C2","C3","C4","C5","C6","C7","C8","C9","C10","C11","C12"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Train Schedules & Stoppages Table
CREATE TABLE IF NOT EXISTS public.train_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    train_number VARCHAR(10) REFERENCES public.trains(train_number) ON DELETE CASCADE,
    station_code VARCHAR(10) REFERENCES public.stations(code),
    stop_sequence INT NOT NULL,
    scheduled_arrival TIME,
    scheduled_departure TIME,
    distance_from_source_km DOUBLE PRECISION NOT NULL,
    day_count INT DEFAULT 1,
    platform_number INT DEFAULT 1,
    dwell_time_minutes INT DEFAULT 1,
    UNIQUE(train_number, stop_sequence)
);

CREATE INDEX IF NOT EXISTS idx_train_schedules_train ON public.train_schedules(train_number);

-- 8. Live Train Telemetry & GPS State Table (Realtime Enabled)
CREATE TABLE IF NOT EXISTS public.train_live_state (
    train_number VARCHAR(10) PRIMARY KEY REFERENCES public.trains(train_number) ON DELETE CASCADE,
    current_latitude DOUBLE PRECISION NOT NULL,
    current_longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    current_speed DOUBLE PRECISION DEFAULT 0.0,
    heading_deg DOUBLE PRECISION DEFAULT 0.0,
    current_section VARCHAR(50),
    last_station_code VARCHAR(10) REFERENCES public.stations(code),
    next_station_code VARCHAR(10) REFERENCES public.stations(code),
    current_delay_minutes INT DEFAULT 0,
    predicted_delay_minutes INT DEFAULT 0,
    delay_probability DOUBLE PRECISION DEFAULT 0.0,
    confidence_score DOUBLE PRECISION DEFAULT 0.95,
    status VARCHAR(30) DEFAULT 'ON_TIME' CHECK (status IN ('ON_TIME', 'DELAYED', 'CRITICAL_DELAY', 'DIVERTED', 'CANCELLED')),
    delay_reasons JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_train_live_state_geom ON public.train_live_state USING GIST(geom);

-- 9. Track Infrastructure Sections Table
CREATE TABLE IF NOT EXISTS public.track_sections (
    section_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_station VARCHAR(10) REFERENCES public.stations(code),
    end_station VARCHAR(10) REFERENCES public.stations(code),
    length_km DOUBLE PRECISION NOT NULL,
    max_speed_kmh INT DEFAULT 130,
    risk_level VARCHAR(20) DEFAULT 'NORMAL' CHECK (risk_level IN ('NORMAL', 'WARNING', 'HIGH_RISK', 'CRITICAL')),
    health_score INT DEFAULT 95 CHECK (health_score BETWEEN 0 AND 100),
    last_inspected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    geom GEOMETRY(LineString, 4326)
);

-- 10. ESP32 + MPU6050 Track Vibration Telemetry Table
CREATE TABLE IF NOT EXISTS public.track_vibration_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id VARCHAR(50) REFERENCES public.track_sections(section_id),
    train_number VARCHAR(10),
    accel_x DOUBLE PRECISION NOT NULL,
    accel_y DOUBLE PRECISION NOT NULL,
    accel_z DOUBLE PRECISION NOT NULL,
    gyro_x DOUBLE PRECISION NOT NULL,
    gyro_y DOUBLE PRECISION NOT NULL,
    gyro_z DOUBLE PRECISION NOT NULL,
    vibration_rms DOUBLE PRECISION NOT NULL,
    anomaly_detected BOOLEAN DEFAULT false,
    severity VARCHAR(20) DEFAULT 'NORMAL',
    confidence DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Multi-Day Progressive Track Deterioration Risks
CREATE TABLE IF NOT EXISTS public.track_progressive_risk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id VARCHAR(50) REFERENCES public.track_sections(section_id),
    observation_date DATE NOT NULL,
    status_label VARCHAR(30) NOT NULL,
    risk_score INT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    trend VARCHAR(20) DEFAULT 'STABLE' CHECK (trend IN ('INCREASING', 'STABLE', 'DECREASING')),
    maintenance_priority VARCHAR(20) DEFAULT 'LOW' CHECK (maintenance_priority IN ('LOW', 'MEDIUM', 'HIGH', 'IMMEDIATE')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Station Platform & Coach Crowd Density Observations
CREATE TABLE IF NOT EXISTS public.crowd_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_code VARCHAR(10) REFERENCES public.stations(code),
    platform_number INT NOT NULL,
    crowd_density_pct INT NOT NULL CHECK (crowd_density_pct BETWEEN 0 AND 100),
    crowd_count INT NOT NULL,
    status_level VARCHAR(20) DEFAULT 'GREEN' CHECK (status_level IN ('GREEN', 'YELLOW', 'RED')),
    observed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Active Railway System Alerts & Advisories
CREATE TABLE IF NOT EXISTS public.railway_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('NORMAL', 'WARNING', 'HIGH_RISK', 'CRITICAL')),
    affected_train VARCHAR(10),
    affected_station VARCHAR(10),
    affected_section VARCHAR(50),
    description TEXT NOT NULL,
    recommended_action TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- HELPER FUNCTIONS & DATABASE TRIGGERS
-- ============================================================================

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach timestamp triggers
CREATE OR REPLACE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_phone_verifications_updated_at
    BEFORE UPDATE ON public.phone_verifications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_train_live_state_updated_at
    BEFORE UPDATE ON public.train_live_state
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Secure Helper Functions for User Role Evaluation
CREATE OR REPLACE FUNCTION public.get_user_role(user_auth_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE auth_user_id = user_auth_id LIMIT 1;
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT public.get_user_role(auth.uid())) IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT public.get_user_role(auth.uid())) = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Automatically Create Profile Record upon new auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role TEXT := 'user';
BEGIN
    -- Check if role metadata is passed in raw_user_meta_data safely
    IF NEW.raw_user_meta_data->>'role' IN ('admin', 'super_admin') THEN
        -- Prevent arbitrary role elevation via client metadata unless created by service role
        default_role := 'user';
    ELSIF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
        default_role := NEW.raw_user_meta_data->>'role';
    END IF;

    INSERT INTO public.profiles (
        auth_user_id,
        email,
        full_name,
        phone_number,
        avatar_url,
        role,
        phone_verified,
        email_verified
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.phone,
        NEW.raw_user_meta_data->>'avatar_url',
        default_role,
        COALESCE((NEW.raw_user_meta_data->>'phone_verified')::boolean, false),
        COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
    )
    ON CONFLICT (auth_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
