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
    type VARCHAR(50) NOT NULL, -- Vande Bharat, Rajdhani, Shatabdi, Superfast, Mail/Express
    source_code VARCHAR(10) REFERENCES stations(code),
    destination_code VARCHAR(10) REFERENCES stations(code),
    total_distance_km DOUBLE PRECISION NOT NULL,
    average_speed_kmh DOUBLE PRECISION NOT NULL,
    runs_on VARCHAR(50) DEFAULT 'DAILY', -- DAILY, MON-WED-FRI, etc.
    rakes_count INT DEFAULT 16,
    coach_composition JSONB, -- Coach classes e.g. ["E1", "C1", "C2", ...] or ["H1", "A1", "A2", "B1", ...]
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
    dwell_time_minutes INT DEFAULT 2,
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
