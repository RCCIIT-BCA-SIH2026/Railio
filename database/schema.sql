-- ============================================================================
-- RailSathi (Smart Rail AI) - Database Schema (PostgreSQL + PostGIS)
-- Predict • Protect • Connect
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users & Roles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20),
    role VARCHAR(30) DEFAULT 'PASSENGER' CHECK (role IN ('PASSENGER', 'ADMIN', 'CONTROLLER')),
    preferred_language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stations Master
CREATE TABLE IF NOT EXISTS stations (
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

-- Spatial index on station locations
CREATE INDEX IF NOT EXISTS idx_stations_geom ON stations USING GIST(geom);

-- Trains Master
CREATE TABLE IF NOT EXISTS trains (
    train_number VARCHAR(10) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL, -- Suburban EMU Local (Sealdah - Dankuni Corridor 32211-32252)
    source_code VARCHAR(10) REFERENCES stations(code),
    destination_code VARCHAR(10) REFERENCES stations(code),
    total_distance_km DOUBLE PRECISION NOT NULL,
    average_speed_kmh DOUBLE PRECISION NOT NULL,
    runs_on VARCHAR(50) DEFAULT 'DAILY', -- DAILY
    rakes_count INT DEFAULT 12,
    coach_composition JSONB DEFAULT '["C1","C2","C3","C4","C5","C6","C7","C8","C9","C10","C11","C12"]'::jsonb, -- 12-coach EMU Suburban composition
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Train Schedules & Stoppages
CREATE TABLE IF NOT EXISTS train_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    train_number VARCHAR(10) REFERENCES trains(train_number) ON DELETE CASCADE,
    station_code VARCHAR(10) REFERENCES stations(code),
    stop_sequence INT NOT NULL,
    scheduled_arrival TIME,
    scheduled_departure TIME,
    distance_from_source_km DOUBLE PRECISION NOT NULL,
    day_count INT DEFAULT 1,
    platform_number INT DEFAULT 1,
    dwell_time_minutes INT DEFAULT 1,
    UNIQUE(train_number, stop_sequence)
);

-- Live Train Telemetry & State (Reflected into Redis for low latency)
CREATE TABLE IF NOT EXISTS train_live_state (
    train_number VARCHAR(10) PRIMARY KEY REFERENCES trains(train_number),
    current_latitude DOUBLE PRECISION NOT NULL,
    current_longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    current_speed DOUBLE PRECISION DEFAULT 0.0,
    heading_deg DOUBLE PRECISION DEFAULT 0.0,
    current_section VARCHAR(50),
    last_station_code VARCHAR(10) REFERENCES stations(code),
    next_station_code VARCHAR(10) REFERENCES stations(code),
    current_delay_minutes INT DEFAULT 0,
    predicted_delay_minutes INT DEFAULT 0,
    delay_probability DOUBLE PRECISION DEFAULT 0.0,
    confidence_score DOUBLE PRECISION DEFAULT 0.95,
    status VARCHAR(30) DEFAULT 'ON_TIME', -- ON_TIME, DELAYED, CRITICAL_DELAY, DIVERTED, CANCELLED
    delay_reasons JSONB, -- [{"factor": "Junction congestion", "impact_min": 6}]
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Track Infrastructure Sections (for Anomaly & Risk Monitoring)
CREATE TABLE IF NOT EXISTS track_sections (
    section_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_station VARCHAR(10) REFERENCES stations(code),
    end_station VARCHAR(10) REFERENCES stations(code),
    length_km DOUBLE PRECISION NOT NULL,
    max_speed_kmh INT DEFAULT 130,
    risk_level VARCHAR(20) DEFAULT 'NORMAL', -- NORMAL, WARNING, HIGH_RISK, CRITICAL
    health_score INT DEFAULT 95, -- 0 to 100
    last_inspected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    geom GEOMETRY(LineString, 4326)
);

-- ESP32 + MPU6050 Track Vibration Logs
CREATE TABLE IF NOT EXISTS track_vibration_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id VARCHAR(50) REFERENCES track_sections(section_id),
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

-- Progressive Track Deterioration Trends (Multi-Day Risk)
CREATE TABLE IF NOT EXISTS track_progressive_risk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id VARCHAR(50) REFERENCES track_sections(section_id),
    observation_date DATE NOT NULL,
    status_label VARCHAR(30) NOT NULL, -- Normal, Slightly abnormal, Abnormal, Highly abnormal
    risk_score INT NOT NULL, -- 0-100
    trend VARCHAR(20) DEFAULT 'STABLE', -- INCREASING, STABLE, DECREASING
    maintenance_priority VARCHAR(20) DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, IMMEDIATE
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Station Platform & Coach Crowd Observations (CV Output)
CREATE TABLE IF NOT EXISTS crowd_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_code VARCHAR(10) REFERENCES stations(code),
    platform_number INT NOT NULL,
    crowd_density_pct INT NOT NULL, -- 0 - 100
    crowd_count INT NOT NULL,
    status_level VARCHAR(20) DEFAULT 'GREEN', -- GREEN, YELLOW, RED
    observed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Active Railway Alerts & Broadcasts
CREATE TABLE IF NOT EXISTS railway_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL, -- WEATHER, TRACK_ANOMALY, OBSTACLE, DELAY, CONGESTION
    severity VARCHAR(20) NOT NULL, -- NORMAL, WARNING, HIGH_RISK, CRITICAL
    affected_train VARCHAR(10),
    affected_station VARCHAR(10),
    affected_section VARCHAR(50),
    description TEXT NOT NULL,
    recommended_action TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Operational Infrastructure Tables (Added for Ground-Reality Telemetry)
-- ============================================================================

-- Caution Orders (Temporary Speed Restrictions / PSR records)
CREATE TABLE IF NOT EXISTS caution_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id VARCHAR(50) NOT NULL,
    start_km FLOAT NOT NULL,
    end_km FLOAT NOT NULL,
    max_speed_kmh FLOAT NOT NULL,
    normal_speed_kmh FLOAT NOT NULL DEFAULT 110,
    reason TEXT NOT NULL DEFAULT 'Maintenance',
    zone VARCHAR(10) NOT NULL DEFAULT 'ER',
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ingested_by VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_caution_orders_section ON caution_orders(section_id);
CREATE INDEX IF NOT EXISTS idx_caution_orders_active ON caution_orders(active);

-- Signal Block State (Live signal aspect per section)
CREATE TABLE IF NOT EXISTS signal_blocks (
    section_id VARCHAR(50) PRIMARY KEY,
    from_station VARCHAR(10) NOT NULL,
    to_station VARCHAR(10) NOT NULL,
    aspect VARCHAR(20) NOT NULL DEFAULT 'GREEN'
        CHECK (aspect IN ('GREEN', 'DOUBLE_YELLOW', 'YELLOW', 'RED')),
    distance_meters FLOAT NOT NULL DEFAULT 1000,
    expected_halt_min FLOAT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crew Duty Logs (HOER compliance tracking)
CREATE TABLE IF NOT EXISTS crew_duty_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crew_id VARCHAR(50) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'LOCO_PILOT'
        CHECK (role IN ('LOCO_PILOT', 'ASSISTANT_LP', 'GUARD')),
    sign_on_time TIME NOT NULL,
    sign_on_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sign_off_time TIME,
    home_depot VARCHAR(50) NOT NULL,
    current_section VARCHAR(50),
    train_number VARCHAR(10) NOT NULL,
    next_crew_change_depot VARCHAR(50),
    estimated_eta_to_depot TIME,
    current_duty_hours FLOAT DEFAULT 0,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'OK'
        CHECK (risk_level IN ('OK', 'MONITOR', 'HIGH_RISK', 'CRITICAL')),
    auto_relief_booked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crew_duty_train ON crew_duty_logs(train_number);
CREATE INDEX IF NOT EXISTS idx_crew_duty_risk ON crew_duty_logs(risk_level);

-- Platform Schedules (time windows for conflict detection)
CREATE TABLE IF NOT EXISTS platform_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_code VARCHAR(10) NOT NULL REFERENCES stations(code),
    platform_number INTEGER NOT NULL,
    train_number VARCHAR(10) NOT NULL,
    train_name VARCHAR(200),
    scheduled_eta TIME NOT NULL,
    predicted_eta TIME,
    dwell_minutes FLOAT NOT NULL DEFAULT 5,
    priority INTEGER NOT NULL DEFAULT 2,
    requires_electric_line BOOLEAN DEFAULT true,
    delay_minutes FLOAT DEFAULT 0,
    conflict_detected BOOLEAN DEFAULT false,
    reallocated_platform INTEGER,
    schedule_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_platform_schedules_station ON platform_schedules(station_code, schedule_date);

-- RTIS Telemetry Log (GPS position history)
CREATE TABLE IF NOT EXISTS rtis_telemetry_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    train_number VARCHAR(10) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed_kmh FLOAT NOT NULL,
    heading_deg FLOAT DEFAULT 0,
    section_id VARCHAR(50),
    delay_minutes FLOAT DEFAULT 0,
    signal_aspect VARCHAR(20) DEFAULT 'GREEN',
    source VARCHAR(20) NOT NULL DEFAULT 'RTIS'
        CHECK (source IN ('RTIS', 'SIMULATED', 'MANUAL')),
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rtis_telemetry_train ON rtis_telemetry_log(train_number, received_at DESC);

-- Prediction Audit Log (for model feedback & continuous evaluation)
CREATE TABLE IF NOT EXISTS prediction_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    train_number VARCHAR(10) NOT NULL,
    station_code VARCHAR(10) NOT NULL,
    predicted_delay_min FLOAT NOT NULL,
    actual_delay_min FLOAT,
    absolute_error_min FLOAT GENERATED ALWAYS AS (
        ABS(COALESCE(actual_delay_min, predicted_delay_min) - predicted_delay_min)
    ) STORED,
    model_type VARCHAR(100) NOT NULL DEFAULT 'GradientBoosting',
    confidence_score FLOAT,
    predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actual_arrival_at TIMESTAMP WITH TIME ZONE,
    features_snapshot JSONB
);
CREATE INDEX IF NOT EXISTS idx_prediction_audit_train ON prediction_audit_log(train_number, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_audit_station ON prediction_audit_log(station_code);

-- Rake Turnaround Log (maintenance scheduling compliance)
CREATE TABLE IF NOT EXISTS rake_turnaround_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rake_id VARCHAR(50) NOT NULL,
    train_number VARCHAR(10) NOT NULL,
    terminus VARCHAR(10) NOT NULL,
    arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
    maintenance_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    maintenance_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_return TIMESTAMP WITH TIME ZONE,
    is_feasible BOOLEAN DEFAULT true,
    violation_minutes FLOAT DEFAULT 0,
    pit_line_assigned INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
