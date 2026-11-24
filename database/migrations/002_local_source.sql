ALTER TABLE scans ADD COLUMN IF NOT EXISTS transport text NOT NULL DEFAULT 'overpass';
ALTER TABLE geo_cache ADD COLUMN IF NOT EXISTS transport text NOT NULL DEFAULT 'overpass';
