-- Ubicate Database Schema
-- Requires PostGIS extension

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    role VARCHAR(20) DEFAULT 'asset', -- 'admin', 'operator', 'asset'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Assets (Devices/Entities being tracked)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- 'vehicle', 'person', 'cargo'
    status VARCHAR(20) DEFAULT 'offline', -- 'moving', 'stopped', 'offline'
    driving_mode VARCHAR(20) DEFAULT 'normal', -- 'normal', 'economic', 'urgent', 'pedestrian'
    speed_limit FLOAT DEFAULT 100, -- km/h
    last_position GEOMETRY(Point, 4326),
    last_updated TIMESTAMPTZ,
    battery_level INT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Positions (Historical tracking)
-- Note: In production, this should be partitioned by captured_at
CREATE TABLE positions (
    id BIGSERIAL PRIMARY KEY,
    asset_id UUID REFERENCES assets(id) NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    speed FLOAT DEFAULT 0, -- km/h
    heading FLOAT DEFAULT 0, -- degrees
    accuracy FLOAT,
    altitude FLOAT,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_assets_last_position ON assets USING GIST(last_position);
CREATE INDEX idx_positions_geom ON positions USING GIST(geom);
CREATE INDEX idx_positions_asset_captured ON positions(asset_id, captured_at DESC);

-- 4. Geofences
CREATE TABLE geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    geom GEOMETRY(Geometry, 4326) NOT NULL,
    type VARCHAR(20) DEFAULT 'polygon', -- 'polygon', 'circle', 'route'
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geofences_geom ON geofences USING GIST(geom);

-- 5. Geofence Events
CREATE TABLE geofence_events (
    id BIGSERIAL PRIMARY KEY,
    asset_id UUID REFERENCES assets(id),
    geofence_id UUID REFERENCES geofences(id),
    event_type VARCHAR(20) NOT NULL, -- 'enter', 'exit'
    captured_at TIMESTAMPTZ DEFAULT NOW()
);
