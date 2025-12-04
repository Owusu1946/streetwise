-- Migration: Create Troski Mode tables
-- Description: Tables for crowdsourced public transit (tro-tro) navigation

-- =====================================================
-- Table: troski_stops
-- Purpose: Known pickup/dropoff locations for troskis
-- =====================================================
CREATE TABLE IF NOT EXISTS troski_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  landmark TEXT, -- Nearby landmark for easier identification
  usage_count INTEGER DEFAULT 0, -- How many routes use this stop
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Spatial index for fast location queries
CREATE INDEX IF NOT EXISTS idx_troski_stops_location ON troski_stops USING GIST(location);

-- Index for name search
CREATE INDEX IF NOT EXISTS idx_troski_stops_name ON troski_stops USING GIN(to_tsvector('english', name));

-- =====================================================
-- Table: troski_routes
-- Purpose: User-contributed journeys from origin to destination
-- =====================================================
CREATE TABLE IF NOT EXISTS troski_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_name TEXT NOT NULL,
  origin_latitude DECIMAL(10, 8) NOT NULL,
  origin_longitude DECIMAL(11, 8) NOT NULL,
  origin_location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(origin_longitude, origin_latitude), 4326)::geography
  ) STORED,
  destination_name TEXT NOT NULL,
  destination_latitude DECIMAL(10, 8) NOT NULL,
  destination_longitude DECIMAL(11, 8) NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(destination_longitude, destination_latitude), 4326)::geography
  ) STORED,
  total_fare DECIMAL(10, 2), -- Optional: estimated total fare in GHS
  estimated_duration INTEGER, -- Optional: estimated duration in minutes
  usage_count INTEGER DEFAULT 1, -- How many users have reported this route
  is_verified BOOLEAN DEFAULT FALSE, -- Admin verification flag
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Spatial indexes for origin and destination queries
CREATE INDEX IF NOT EXISTS idx_troski_routes_origin ON troski_routes USING GIST(origin_location);
CREATE INDEX IF NOT EXISTS idx_troski_routes_destination ON troski_routes USING GIST(destination_location);

-- =====================================================
-- Table: troski_route_stops
-- Purpose: Ordered stops along a route (pickup/transfer points)
-- =====================================================
CREATE TABLE IF NOT EXISTS troski_route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES troski_routes(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES troski_stops(id) ON DELETE SET NULL,
  -- If stop doesn't exist in troski_stops, store inline
  stop_name TEXT NOT NULL,
  stop_latitude DECIMAL(10, 8) NOT NULL,
  stop_longitude DECIMAL(11, 8) NOT NULL,
  stop_location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(stop_longitude, stop_latitude), 4326)::geography
  ) STORED,
  sequence_order INTEGER NOT NULL, -- Order of stops (1, 2, 3...)
  stop_type TEXT NOT NULL CHECK (stop_type IN ('board', 'alight', 'transfer')),
  troski_description TEXT, -- e.g., "Take Circle-bound troski"
  fare_from_previous DECIMAL(10, 2), -- Fare from previous stop
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for route lookups
CREATE INDEX IF NOT EXISTS idx_troski_route_stops_route ON troski_route_stops(route_id);

-- Index for stop sequence
CREATE INDEX IF NOT EXISTS idx_troski_route_stops_sequence ON troski_route_stops(route_id, sequence_order);

-- Spatial index for stop locations
CREATE INDEX IF NOT EXISTS idx_troski_route_stops_location ON troski_route_stops USING GIST(stop_location);

-- =====================================================
-- Row Level Security
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE troski_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE troski_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE troski_route_stops ENABLE ROW LEVEL SECURITY;

-- Policies for troski_stops
CREATE POLICY "Allow public read troski_stops"
  ON troski_stops FOR SELECT USING (true);

CREATE POLICY "Allow public insert troski_stops"
  ON troski_stops FOR INSERT WITH CHECK (true);

-- Policies for troski_routes
CREATE POLICY "Allow public read troski_routes"
  ON troski_routes FOR SELECT USING (true);

CREATE POLICY "Allow public insert troski_routes"
  ON troski_routes FOR INSERT WITH CHECK (true);

-- Policies for troski_route_stops
CREATE POLICY "Allow public read troski_route_stops"
  ON troski_route_stops FOR SELECT USING (true);

CREATE POLICY "Allow public insert troski_route_stops"
  ON troski_route_stops FOR INSERT WITH CHECK (true);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to find routes matching origin and destination areas
CREATE OR REPLACE FUNCTION find_troski_routes(
  origin_lat DECIMAL,
  origin_lng DECIMAL,
  dest_lat DECIMAL,
  dest_lng DECIMAL,
  search_radius_meters INTEGER DEFAULT 1000
)
RETURNS TABLE (
  id UUID,
  origin_name TEXT,
  origin_latitude DECIMAL,
  origin_longitude DECIMAL,
  destination_name TEXT,
  destination_latitude DECIMAL,
  destination_longitude DECIMAL,
  total_fare DECIMAL,
  estimated_duration INTEGER,
  usage_count INTEGER,
  origin_distance FLOAT,
  destination_distance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.origin_name,
    r.origin_latitude,
    r.origin_longitude,
    r.destination_name,
    r.destination_latitude,
    r.destination_longitude,
    r.total_fare,
    r.estimated_duration,
    r.usage_count,
    ST_Distance(
      r.origin_location,
      ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)::geography
    ) as origin_distance,
    ST_Distance(
      r.destination_location,
      ST_SetSRID(ST_MakePoint(dest_lng, dest_lat), 4326)::geography
    ) as destination_distance
  FROM troski_routes r
  WHERE
    ST_DWithin(
      r.origin_location,
      ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)::geography,
      search_radius_meters
    )
    AND ST_DWithin(
      r.destination_location,
      ST_SetSRID(ST_MakePoint(dest_lng, dest_lat), 4326)::geography,
      search_radius_meters
    )
  ORDER BY
    (origin_distance + destination_distance) ASC,
    r.usage_count DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get nearby troski stops
CREATE OR REPLACE FUNCTION get_nearby_troski_stops(
  lat DECIMAL,
  lng DECIMAL,
  radius_meters INTEGER DEFAULT 500,
  max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  landmark TEXT,
  usage_count INTEGER,
  distance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.description,
    s.latitude,
    s.longitude,
    s.landmark,
    s.usage_count,
    ST_Distance(
      s.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance
  FROM troski_stops s
  WHERE ST_DWithin(
    s.location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE troski_stops IS 'Known pickup/dropoff locations for tro-tro navigation';
COMMENT ON TABLE troski_routes IS 'User-contributed journey routes with origin and destination';
COMMENT ON TABLE troski_route_stops IS 'Ordered stops along a troski route for navigation instructions';
COMMENT ON FUNCTION find_troski_routes IS 'Find routes matching origin/destination with spatial search';
COMMENT ON FUNCTION get_nearby_troski_stops IS 'Get troski stops within radius of a location';

-- =====================================================
-- Additional Helper Function: Find routes by destination only
-- =====================================================
CREATE OR REPLACE FUNCTION find_routes_by_destination(
  dest_lat DECIMAL,
  dest_lng DECIMAL,
  search_radius_meters INTEGER DEFAULT 15000
)
RETURNS TABLE (
  id UUID,
  origin_name TEXT,
  origin_latitude DECIMAL,
  origin_longitude DECIMAL,
  destination_name TEXT,
  destination_latitude DECIMAL,
  destination_longitude DECIMAL,
  total_fare DECIMAL,
  estimated_duration INTEGER,
  usage_count INTEGER,
  destination_distance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.origin_name,
    r.origin_latitude,
    r.origin_longitude,
    r.destination_name,
    r.destination_latitude,
    r.destination_longitude,
    r.total_fare,
    r.estimated_duration,
    r.usage_count,
    ST_Distance(
      r.destination_location,
      ST_SetSRID(ST_MakePoint(dest_lng, dest_lat), 4326)::geography
    ) as destination_distance
  FROM troski_routes r
  WHERE ST_DWithin(
    r.destination_location,
    ST_SetSRID(ST_MakePoint(dest_lng, dest_lat), 4326)::geography,
    search_radius_meters
  )
  ORDER BY
    destination_distance ASC,
    r.usage_count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to search routes by destination name (text search)
CREATE OR REPLACE FUNCTION search_routes_by_destination_name(
  search_query TEXT
)
RETURNS TABLE (
  id UUID,
  origin_name TEXT,
  origin_latitude DECIMAL,
  origin_longitude DECIMAL,
  destination_name TEXT,
  destination_latitude DECIMAL,
  destination_longitude DECIMAL,
  total_fare DECIMAL,
  estimated_duration INTEGER,
  usage_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.origin_name,
    r.origin_latitude,
    r.origin_longitude,
    r.destination_name,
    r.destination_latitude,
    r.destination_longitude,
    r.total_fare,
    r.estimated_duration,
    r.usage_count
  FROM troski_routes r
  WHERE 
    r.destination_name ILIKE '%' || search_query || '%'
    OR r.origin_name ILIKE '%' || search_query || '%'
  ORDER BY
    r.usage_count DESC,
    r.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_routes_by_destination IS 'Find routes going to a destination area (spatial search)';
COMMENT ON FUNCTION search_routes_by_destination_name IS 'Search routes by destination name (text search)';

