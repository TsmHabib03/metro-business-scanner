CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS scanner_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS geo_cache (
 city text PRIMARY KEY, relation_id bigint NOT NULL, areas jsonb NOT NULL DEFAULT '[]', verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS scans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scope jsonb NOT NULL,
 state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','completed','failed','cancelled')),
 stage text NOT NULL DEFAULT 'Waiting for worker', found integer NOT NULL DEFAULT 0, stored integer NOT NULL DEFAULT 0,
 error text, attempts integer NOT NULL DEFAULT 0, cancel_requested boolean NOT NULL DEFAULT false,
 boundary_id bigint, source_timestamp timestamptz, created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS scans_queue ON scans(created_at) WHERE state = 'queued';
CREATE TABLE IF NOT EXISTS businesses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), osm_type text NOT NULL CHECK (osm_type IN ('node','way','relation')), osm_id bigint NOT NULL,
 name text NOT NULL, category text NOT NULL, city text NOT NULL, address text NOT NULL DEFAULT '', district text NOT NULL DEFAULT '', barangay text NOT NULL DEFAULT '',
 lat double precision, lon double precision, location geometry(Point,4326),
 website text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', social text NOT NULL DEFAULT '',
 source_url text NOT NULL, tags jsonb NOT NULL,
 website_status text NOT NULL CHECK (website_status IN ('not_listed','existing','unavailable','review','social_only')),
 website_reason text NOT NULL, checked_at timestamptz,
 discovered_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(osm_type, osm_id)
);
CREATE INDEX IF NOT EXISTS businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS businesses_location ON businesses USING gist(location);
CREATE TABLE IF NOT EXISTS scan_businesses (
 scan_id uuid REFERENCES scans(id) ON DELETE CASCADE, business_id uuid REFERENCES businesses(id) ON DELETE CASCADE, PRIMARY KEY(scan_id,business_id)
);
-- Independent user-authored workflow data; never overwritten by a discovery refresh.
CREATE TABLE IF NOT EXISTS prospects (
 business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','saved','contacted','qualified','won','dismissed')),
 notes text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS website_checks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
 requested_url text NOT NULL, status text NOT NULL, reason text NOT NULL, checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS source_requests (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, requested_at timestamptz NOT NULL DEFAULT now(), operation text NOT NULL
);
CREATE INDEX IF NOT EXISTS source_request_date ON source_requests(requested_at);
