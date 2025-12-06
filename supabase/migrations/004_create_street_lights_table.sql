-- ============================================
-- Street Lights Table and Functions for Accra
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create street_lights table
CREATE TABLE IF NOT EXISTS street_lights (
    id BIGSERIAL PRIMARY KEY,
    numero_ouvrage TEXT,
    numero_lampe TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geometry GEOMETRY(Point, 4326),
    district TEXT,
    area TEXT,
    categorie_ouvrage TEXT,
    regime_horaire TEXT, -- '24H/24' or 'NUIT'
    categorie_voie TEXT,
    type_lampe TEXT,
    famille_luminaire TEXT,
    puissance_nominale INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for fast geo queries
CREATE INDEX IF NOT EXISTS idx_street_lights_geometry 
ON street_lights USING GIST (geometry);

-- Create index on coordinates for point queries
CREATE INDEX IF NOT EXISTS idx_street_lights_coords 
ON street_lights (latitude, longitude);

-- ============================================
-- Function: count_lights_along_route
-- Counts street lights within a buffer of a route
-- ============================================
CREATE OR REPLACE FUNCTION count_lights_along_route(
    route_geojson JSONB,
    buffer_meters INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_lights INTEGER,
    lights_24h INTEGER,
    lights_night_only INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    route_line GEOMETRY;
    buffered_route GEOMETRY;
BEGIN
    -- Convert GeoJSON to geometry
    route_line := ST_SetSRID(ST_GeomFromGeoJSON(route_geojson::TEXT), 4326);
    
    -- Create buffer around route (convert meters to degrees approximately)
    -- 1 degree ≈ 111km at equator, so buffer_meters/111000
    buffered_route := ST_Buffer(
        route_line::geography, 
        buffer_meters
    )::geometry;
    
    -- Count lights within buffer
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_lights,
        COUNT(*) FILTER (WHERE sl.regime_horaire = '24H/24')::INTEGER as lights_24h,
        COUNT(*) FILTER (WHERE sl.regime_horaire = 'NUIT' OR sl.regime_horaire IS NULL)::INTEGER as lights_night_only
    FROM street_lights sl
    WHERE ST_Intersects(sl.geometry, buffered_route);
END;
$$;

-- ============================================
-- Function: get_nearby_lights
-- Gets street lights within radius of a point
-- ============================================
CREATE OR REPLACE FUNCTION get_nearby_lights(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 50
)
RETURNS TABLE (
    id BIGINT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    categorie_ouvrage TEXT,
    regime_horaire TEXT,
    type_lampe TEXT,
    distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
DECLARE
    point_geom GEOMETRY;
BEGIN
    point_geom := ST_SetSRID(ST_MakePoint(lng, lat), 4326);
    
    RETURN QUERY
    SELECT 
        sl.id,
        sl.latitude,
        sl.longitude,
        sl.categorie_ouvrage,
        sl.regime_horaire,
        sl.type_lampe,
        ST_Distance(sl.geometry::geography, point_geom::geography) as distance_meters
    FROM street_lights sl
    WHERE ST_DWithin(sl.geometry::geography, point_geom::geography, radius_meters)
    ORDER BY distance_meters;
END;
$$;

-- ============================================
-- Mock Street Light Data for Accra, Ghana
-- Major areas covered:
-- - Osu, Oxford Street
-- - Airport Residential Area
-- - Cantonments
-- - Dzorwulu
-- - Labone
-- - Independence Square area
-- - Accra Mall area
-- ============================================

-- Clear existing data (if you want to refresh)
-- DELETE FROM street_lights;

-- Insert mock street lights data for Accra
INSERT INTO street_lights (latitude, longitude, geometry, district, area, categorie_ouvrage, regime_horaire, type_lampe, puissance_nominale)
VALUES
-- Oxford Street, Osu (well-lit commercial area)
(5.5568, -0.1790, ST_SetSRID(ST_MakePoint(-0.1790, 5.5568), 4326), 'Osu', 'Oxford Street', 'LAMPADAIRE', '24H/24', 'LED', 150),
(5.5569, -0.1785, ST_SetSRID(ST_MakePoint(-0.1785, 5.5569), 4326), 'Osu', 'Oxford Street', 'LAMPADAIRE', '24H/24', 'LED', 150),
(5.5570, -0.1780, ST_SetSRID(ST_MakePoint(-0.1780, 5.5570), 4326), 'Osu', 'Oxford Street', 'LAMPADAIRE', '24H/24', 'LED', 150),
(5.5571, -0.1775, ST_SetSRID(ST_MakePoint(-0.1775, 5.5571), 4326), 'Osu', 'Oxford Street', 'LAMPADAIRE', '24H/24', 'LED', 150),
(5.5572, -0.1770, ST_SetSRID(ST_MakePoint(-0.1770, 5.5572), 4326), 'Osu', 'Oxford Street', 'LAMPADAIRE', '24H/24', 'LED', 150),
(5.5573, -0.1765, ST_SetSRID(ST_MakePoint(-0.1765, 5.5573), 4326), 'Osu', 'Oxford Street', 'LAMPADAIRE', 'NUIT', 'LED', 100),
(5.5574, -0.1760, ST_SetSRID(ST_MakePoint(-0.1760, 5.5574), 4326), 'Osu', 'Oxford Street', 'LAMPADAIRE', 'NUIT', 'LED', 100),
(5.5575, -0.1755, ST_SetSRID(ST_MakePoint(-0.1755, 5.5575), 4326), 'Osu', 'Oxford Street', 'LAMPADAIRE', '24H/24', 'LED', 150),

-- Labone area
(5.5625, -0.1720, ST_SetSRID(ST_MakePoint(-0.1720, 5.5625), 4326), 'Labone', 'Labone Junction', 'LAMPADAIRE', '24H/24', 'LED', 150),
(5.5630, -0.1715, ST_SetSRID(ST_MakePoint(-0.1715, 5.5630), 4326), 'Labone', 'Labone Street', 'LAMPADAIRE', 'NUIT', 'LED', 100),
(5.5635, -0.1710, ST_SetSRID(ST_MakePoint(-0.1710, 5.5635), 4326), 'Labone', 'Labone Road', 'LAMPADAIRE', 'NUIT', 'LED', 100),
(5.5640, -0.1705, ST_SetSRID(ST_MakePoint(-0.1705, 5.5640), 4326), 'Labone', 'Labone Main', 'LAMPADAIRE', '24H/24', 'LED', 150),

-- Cantonments
(5.5720, -0.1680, ST_SetSRID(ST_MakePoint(-0.1680, 5.5720), 4326), 'Cantonments', 'Switchback Road', 'LAMPADAIRE', '24H/24', 'LED', 150),
(5.5725, -0.1675, ST_SetSRID(ST_MakePoint(-0.1675, 5.5725), 4326), 'Cantonments', 'Switchback Road', 'LAMPADAIRE', '24H/24', 'LED', 150),
(5.5730, -0.1670, ST_SetSRID(ST_MakePoint(-0.1670, 5.5730), 4326), 'Cantonments', 'Switchback Lane', 'LAMPADAIRE', 'NUIT', 'LED', 100),
(5.5735, -0.1665, ST_SetSRID(ST_MakePoint(-0.1665, 5.5735), 4326), 'Cantonments', 'Embassy Road', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.5740, -0.1660, ST_SetSRID(ST_MakePoint(-0.1660, 5.5740), 4326), 'Cantonments', 'Embassy Road', 'LAMPADAIRE', '24H/24', 'LED', 200),

-- Airport Residential Area
(5.5950, -0.1750, ST_SetSRID(ST_MakePoint(-0.1750, 5.5950), 4326), 'Airport Residential', 'Aviation Road', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.5955, -0.1745, ST_SetSRID(ST_MakePoint(-0.1745, 5.5955), 4326), 'Airport Residential', 'Aviation Road', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.5960, -0.1740, ST_SetSRID(ST_MakePoint(-0.1740, 5.5960), 4326), 'Airport Residential', 'Airport Bypass', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.5965, -0.1735, ST_SetSRID(ST_MakePoint(-0.1735, 5.5965), 4326), 'Airport Residential', 'Airport Bypass', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.5970, -0.1730, ST_SetSRID(ST_MakePoint(-0.1730, 5.5970), 4326), 'Airport Residential', 'Liberation Road', 'LAMPADAIRE', '24H/24', 'LED', 250),

-- Dzorwulu
(5.5980, -0.1950, ST_SetSRID(ST_MakePoint(-0.1950, 5.5980), 4326), 'Dzorwulu', 'Dzorwulu Road', 'LAMPADAIRE', 'NUIT', 'LED', 100),
(5.5985, -0.1955, ST_SetSRID(ST_MakePoint(-0.1955, 5.5985), 4326), 'Dzorwulu', 'Dzorwulu Road', 'LAMPADAIRE', 'NUIT', 'LED', 100),
(5.5990, -0.1960, ST_SetSRID(ST_MakePoint(-0.1960, 5.5990), 4326), 'Dzorwulu', 'Dzorwulu Junction', 'LAMPADAIRE', '24H/24', 'LED', 150),
(5.5995, -0.1965, ST_SetSRID(ST_MakePoint(-0.1965, 5.5995), 4326), 'Dzorwulu', 'Main Street', 'LAMPADAIRE', 'NUIT', 'LED', 100),

-- Independence Square / Black Star Square area
(5.5450, -0.2010, ST_SetSRID(ST_MakePoint(-0.2010, 5.5450), 4326), 'Independence Square', 'Liberation Road', 'LAMPADAIRE', '24H/24', 'LED', 300),
(5.5455, -0.2005, ST_SetSRID(ST_MakePoint(-0.2005, 5.5455), 4326), 'Independence Square', 'Liberation Road', 'LAMPADAIRE', '24H/24', 'LED', 300),
(5.5460, -0.2000, ST_SetSRID(ST_MakePoint(-0.2000, 5.5460), 4326), 'Independence Square', 'Independence Ave', 'LAMPADAIRE', '24H/24', 'LED', 300),
(5.5465, -0.1995, ST_SetSRID(ST_MakePoint(-0.1995, 5.5465), 4326), 'Independence Square', 'Independence Ave', 'LAMPADAIRE', '24H/24', 'LED', 300),
(5.5470, -0.1990, ST_SetSRID(ST_MakePoint(-0.1990, 5.5470), 4326), 'Independence Square', 'Black Star Lane', 'LAMPADAIRE', '24H/24', 'LED', 250),

-- Accra Mall area (Spintex Road)
(5.6250, -0.1150, ST_SetSRID(ST_MakePoint(-0.1150, 5.6250), 4326), 'Spintex', 'Spintex Road', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.6255, -0.1145, ST_SetSRID(ST_MakePoint(-0.1145, 5.6255), 4326), 'Spintex', 'Spintex Road', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.6260, -0.1140, ST_SetSRID(ST_MakePoint(-0.1140, 5.6260), 4326), 'Spintex', 'Mall Road', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.6265, -0.1135, ST_SetSRID(ST_MakePoint(-0.1135, 5.6265), 4326), 'Spintex', 'Mall Road', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.6270, -0.1130, ST_SetSRID(ST_MakePoint(-0.1130, 5.6270), 4326), 'Spintex', 'Accra Mall Entrance', 'LAMPADAIRE', '24H/24', 'LED', 250),

-- Ring Road Central
(5.5600, -0.2050, ST_SetSRID(ST_MakePoint(-0.2050, 5.5600), 4326), 'Ring Road', 'Ring Road Central', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.5605, -0.2055, ST_SetSRID(ST_MakePoint(-0.2055, 5.5605), 4326), 'Ring Road', 'Ring Road Central', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.5610, -0.2060, ST_SetSRID(ST_MakePoint(-0.2060, 5.5610), 4326), 'Ring Road', 'Danquah Circle', 'LAMPADAIRE', '24H/24', 'LED', 250),
(5.5615, -0.2065, ST_SetSRID(ST_MakePoint(-0.2065, 5.5615), 4326), 'Ring Road', 'Danquah Circle', 'LAMPADAIRE', '24H/24', 'LED', 250),
(5.5620, -0.2070, ST_SetSRID(ST_MakePoint(-0.2070, 5.5620), 4326), 'Ring Road', 'Ring Road West', 'LAMPADAIRE', 'NUIT', 'LED', 150),

-- Tema Station area
(5.5480, -0.2080, ST_SetSRID(ST_MakePoint(-0.2080, 5.5480), 4326), 'Central Accra', 'Tema Station', 'LAMPADAIRE', '24H/24', 'LED', 150),
(5.5485, -0.2085, ST_SetSRID(ST_MakePoint(-0.2085, 5.5485), 4326), 'Central Accra', 'Tema Station', 'LAMPADAIRE', '24H/24', 'LED', 150),
(5.5490, -0.2090, ST_SetSRID(ST_MakePoint(-0.2090, 5.5490), 4326), 'Central Accra', 'Kinbu Road', 'LAMPADAIRE', 'NUIT', 'LED', 100),
(5.5495, -0.2095, ST_SetSRID(ST_MakePoint(-0.2095, 5.5495), 4326), 'Central Accra', 'Kinbu Road', 'LAMPADAIRE', 'NUIT', 'LED', 100),

-- Adabraka
(5.5655, -0.2150, ST_SetSRID(ST_MakePoint(-0.2150, 5.5655), 4326), 'Adabraka', 'Kojo Thompson Road', 'LAMPADAIRE', 'NUIT', 'LED', 100),
(5.5660, -0.2155, ST_SetSRID(ST_MakePoint(-0.2155, 5.5660), 4326), 'Adabraka', 'Kojo Thompson Road', 'LAMPADAIRE', 'NUIT', 'LED', 100),
(5.5665, -0.2160, ST_SetSRID(ST_MakePoint(-0.2160, 5.5665), 4326), 'Adabraka', 'Adabraka Junction', 'LAMPADAIRE', '24H/24', 'LED', 150),

-- East Legon
(5.6350, -0.1550, ST_SetSRID(ST_MakePoint(-0.1550, 5.6350), 4326), 'East Legon', 'American House', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.6355, -0.1545, ST_SetSRID(ST_MakePoint(-0.1545, 5.6355), 4326), 'East Legon', 'American House', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.6360, -0.1540, ST_SetSRID(ST_MakePoint(-0.1540, 5.6360), 4326), 'East Legon', 'Lagos Avenue', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.6365, -0.1535, ST_SetSRID(ST_MakePoint(-0.1535, 5.6365), 4326), 'East Legon', 'Lagos Avenue', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.6370, -0.1530, ST_SetSRID(ST_MakePoint(-0.1530, 5.6370), 4326), 'East Legon', 'Boundary Road', 'LAMPADAIRE', 'NUIT', 'LED', 150),

-- University of Ghana, Legon
(5.6500, -0.1850, ST_SetSRID(ST_MakePoint(-0.1850, 5.6500), 4326), 'Legon', 'University Road', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.6505, -0.1855, ST_SetSRID(ST_MakePoint(-0.1855, 5.6505), 4326), 'Legon', 'University Road', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.6510, -0.1860, ST_SetSRID(ST_MakePoint(-0.1860, 5.6510), 4326), 'Legon', 'Campus Gate', 'LAMPADAIRE', '24H/24', 'LED', 250),
(5.6515, -0.1865, ST_SetSRID(ST_MakePoint(-0.1865, 5.6515), 4326), 'Legon', 'Campus Main', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.6520, -0.1870, ST_SetSRID(ST_MakePoint(-0.1870, 5.6520), 4326), 'Legon', 'Balme Library', 'LAMPADAIRE', '24H/24', 'LED', 200),

-- Korle Bu
(5.5350, -0.2250, ST_SetSRID(ST_MakePoint(-0.2250, 5.5350), 4326), 'Korle Bu', 'Hospital Road', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.5355, -0.2255, ST_SetSRID(ST_MakePoint(-0.2255, 5.5355), 4326), 'Korle Bu', 'Hospital Road', 'LAMPADAIRE', '24H/24', 'LED', 200),
(5.5360, -0.2260, ST_SetSRID(ST_MakePoint(-0.2260, 5.5360), 4326), 'Korle Bu', 'Hospital Main', 'LAMPADAIRE', '24H/24', 'LED', 250),
(5.5365, -0.2265, ST_SetSRID(ST_MakePoint(-0.2265, 5.5365), 4326), 'Korle Bu', 'Emergency Wing', 'LAMPADAIRE', '24H/24', 'LED', 250);

-- Display summary
SELECT 
    district, 
    COUNT(*) as light_count,
    COUNT(*) FILTER (WHERE regime_horaire = '24H/24') as always_on,
    COUNT(*) FILTER (WHERE regime_horaire = 'NUIT') as night_only
FROM street_lights 
GROUP BY district 
ORDER BY light_count DESC;
