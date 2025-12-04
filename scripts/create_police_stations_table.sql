-- Create police_stations table
CREATE TABLE IF NOT EXISTS police_stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_police_stations_location
  ON police_stations (latitude, longitude);

-- Add a spatial index if PostGIS is available (optional but recommended)
-- CREATE INDEX IF NOT EXISTS idx_police_stations_geography
--   ON police_stations USING GIST (geography(POINT(longitude, latitude)));

-- Enable Row Level Security (optional)
ALTER TABLE police_stations ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all users to read police stations
CREATE POLICY "Police stations are viewable by everyone"
  ON police_stations FOR SELECT
  USING (true);