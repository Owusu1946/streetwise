-- Import police stations data from CSV
-- Run this script after creating the police_stations table

-- Ghanaian (Accra) police stations
INSERT INTO police_stations (name, address, latitude, longitude) VALUES
('Ghana Police Headquarters', 'High Street, Ridge, Accra, Ghana', 5.5577, -0.1969),
('Nima Police Station', 'Nima Road, Nima, Accra, Ghana', 5.5930, -0.2020),
('Madina Police Station', 'Madina Road, Madina, Accra, Ghana', 5.6790, -0.1680),
('Jamestown Police Station', 'High Street, Jamestown, Accra, Ghana', 5.5340, -0.2120),
('Nungua Police Station', 'Nungua Road, Nungua, Accra, Ghana', 5.6050, -0.0820),
('Dansoman Police Station', 'Dansoman Road, Dansoman, Accra, Ghana', 5.5580, -0.2850),
('Tesano Police Station', 'Tesano Main Road, Tesano, Accra, Ghana', 5.6150, -0.2150),
('Legon Police Station', 'University of Ghana Road, Legon, Accra, Ghana', 5.6500, -0.1870),
('Adabraka Police Station', 'Farrar Avenue, Adabraka, Accra, Ghana', 5.5750, -0.2140),
('Achimota Police Station', 'Achimota Road, Achimota, Accra, Ghana', 5.6380, -0.2340),
('Osu Police Station', 'Cantonments Road, Osu, Accra, Ghana', 5.5600, -0.1720),
('Kotobabi Police Station', 'Kotobabi Road, Kotobabi, Accra, Ghana', 5.6000, -0.2200),
('Sowutuom Police Station', 'Sowutuom Road, Sowutuom, Accra, Ghana', 5.6250, -0.2650),
('Darkuman Police Station', 'Darkuman Junction, Darkuman, Accra, Ghana', 5.5650, -0.2560),
('Airport Police Station', 'Airport By-Pass Road, Airport Residential Area, Accra, Ghana', 5.6050, -0.1820),
('Kwashieman Police Station', 'Kwashieman Road, Kwashieman, Accra, Ghana', 5.5950, -0.2520),
('La Police Station', 'La Beach Road, La, Accra, Ghana', 5.5710, -0.1530),
('Teshie Police Station', 'Teshie High Street, Teshie, Accra, Ghana', 5.5920, -0.1050),
('Tema Police Headquarters', 'Community 1, Tema, Ghana', 5.6690, 0.0170),
('Ashaiman Police Station', 'Ashaiman Main Road, Ashaiman, Ghana', 5.6950, -0.0330)
ON CONFLICT DO NOTHING;