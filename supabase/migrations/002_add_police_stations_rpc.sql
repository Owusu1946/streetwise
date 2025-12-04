-- Add geography column to police_stations table for spatial queries
ALTER TABLE police_stations ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
) STORED;

-- Create spatial index for efficient geospatial queries
CREATE INDEX IF NOT EXISTS idx_police_stations_geography ON police_stations USING GIST(location);

-- Create function to get police stations near a route
CREATE OR REPLACE FUNCTION get_police_stations_near_route(
  route_geojson JSONB,
  buffer_meters INTEGER DEFAULT 300
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.name,
    p.address,
    p.latitude,
    p.longitude
  FROM police_stations p
  WHERE ST_DWithin(
    p.location,
    ST_GeomFromGeoJSON(route_geojson)::geography,
    buffer_meters
  )
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for documentation
COMMENT ON FUNCTION get_police_stations_near_route IS 'Finds all police stations within a buffer distance of a route';