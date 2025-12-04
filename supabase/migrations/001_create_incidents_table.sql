-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'harassment',
    'aggressive',
    'pickpocket',
    'suspicious',
    'vandalism',
    'protest',
    'insecurity',
    'passage',
    'animal',
    'poorlight'
  )),
  latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create spatial index for efficient geospatial queries
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST(location);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);

-- Enable Row Level Security
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read incidents (anonymous access)
CREATE POLICY "Allow public read access"
  ON incidents
  FOR SELECT
  USING (true);

-- Policy: Allow anyone to insert incidents (anonymous reporting)
CREATE POLICY "Allow public insert access"
  ON incidents
  FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE incidents IS 'Stores user-reported safety incidents for route safety calculations';
COMMENT ON COLUMN incidents.location IS 'Computed geography column for spatial queries using PostGIS';
COMMENT ON COLUMN incidents.severity IS 'Severity score from 1-10 based on incident type (see config/safety.ts)';

-- Create function to get incidents near a route
CREATE OR REPLACE FUNCTION get_incidents_near_route(
  route_geojson JSONB,
  buffer_meters INTEGER DEFAULT 100,
  cutoff_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  severity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.type,
    i.latitude,
    i.longitude,
    i.severity,
    i.created_at
  FROM incidents i
  WHERE
    i.created_at >= cutoff_date
    AND ST_DWithin(
      i.location,
      ST_GeomFromGeoJSON(route_geojson)::geography,
      buffer_meters
    )
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;
