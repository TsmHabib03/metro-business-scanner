-- Reviewable PostgreSQL 16+ / PostGIS 3.x schema proposal. NOT an applied migration.
-- No sources, permissions, boundaries, credentials, or scans are activated here.
-- Application roles must NOT own these tables. API/worker policy enforcement is
-- mandatory; relational separation does not establish license independence.
BEGIN;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA IF NOT EXISTS app;
SET LOCAL search_path = app, public;

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  distribution_mode text NOT NULL DEFAULT 'internal_single_org'
    CHECK (distribution_mode IN ('internal_single_org', 'review_required')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workspace_members (
  workspace_id uuid NOT NULL REFERENCES workspaces,
  user_id uuid NOT NULL REFERENCES users,
  role text NOT NULL CHECK (role IN ('owner', 'operator')),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('open_data', 'licensed', 'manual', 'fixture')),
  state text NOT NULL DEFAULT 'proposed'
    CHECK (state IN ('proposed', 'verified', 'suspended', 'rejected', 'expired')),
  current_policy_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE source_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES sources,
  version integer NOT NULL CHECK (version > 0),
  applicable_scope text NOT NULL, -- agreement/account/region/distribution scope
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'verified', 'rejected', 'expired')),
  reviewed_by uuid REFERENCES users,
  reviewed_at timestamptz,
  review_due_at timestamptz,
  agreement_expires_at timestamptz,
  license_identifier text,
  attribution_text text,
  license_bundle_ref text,
  endpoint_terms_ref text,
  retention_rules jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(retention_rules) = 'object'),
  deletion_rules jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(deletion_rules) = 'object'),
  recipient_rules jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(recipient_rules) = 'object'),
  UNIQUE (source_id, version),
  UNIQUE (source_id, id),
  CHECK (status <> 'verified' OR
    (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND
      review_due_at IS NOT NULL AND review_due_at > reviewed_at))
);
ALTER TABLE sources ADD CONSTRAINT current_policy_belongs_to_source
  FOREIGN KEY (id, current_policy_id) REFERENCES source_policies(source_id, id);
CREATE TABLE policy_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES source_policies,
  url text NOT NULL,
  retrieved_at timestamptz NOT NULL,
  document_sha256 text CHECK (document_sha256 ~ '^[a-f0-9]{64}$'),
  clause_reference text,
  interpretation text NOT NULL
);
CREATE TABLE policy_capabilities (
  policy_id uuid NOT NULL REFERENCES source_policies,
  capability text NOT NULL CHECK (capability IN (
    'discover', 'persist_identifiers', 'persist_fields', 'retain_raw',
    'spatial_process', 'website_check', 'maplibre_display', 'prospecting',
    'export_csv', 'export_xlsx', 'share', 'mix', 'derive')),
  allowed boolean NOT NULL DEFAULT false,
  conditions jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(conditions) = 'object'),
  PRIMARY KEY (policy_id, capability)
);
CREATE TABLE policy_fields (
  policy_id uuid NOT NULL REFERENCES source_policies,
  field_key text NOT NULL, -- e.g. name, address, geometry, website, phone
  persist_allowed boolean NOT NULL DEFAULT false,
  display_allowed boolean NOT NULL DEFAULT false,
  assessment_allowed boolean NOT NULL DEFAULT false,
  csv_allowed boolean NOT NULL DEFAULT false,
  xlsx_allowed boolean NOT NULL DEFAULT false,
  max_retention_seconds bigint CHECK (max_retention_seconds > 0),
  unlimited_retention_verified boolean NOT NULL DEFAULT false,
  conditions jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(conditions) = 'object'),
  PRIMARY KEY (policy_id, field_key),
  CHECK (NOT persist_allowed OR
    max_retention_seconds IS NOT NULL OR unlimited_retention_verified)
);

CREATE TABLE geography_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  reference_source_url text NOT NULL,
  boundary_source_url text NOT NULL,
  reference_license_ref text NOT NULL,
  boundary_license_ref text NOT NULL,
  retrieved_at timestamptz NOT NULL,
  effective_date date,
  verified_by uuid REFERENCES users,
  verified_at timestamptz,
  scan_enabled boolean NOT NULL DEFAULT false,
  CHECK (NOT scan_enabled OR (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE TABLE administrative_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES geography_releases,
  kind text NOT NULL CHECK (kind IN ('region', 'city', 'municipality', 'barangay')),
  reference_code text, -- preserve leading zeros; do not fabricate PSGC values
  name text NOT NULL,
  parent_id uuid,
  geometry geometry(MultiPolygon, 4326),
  geometry_method text,
  UNIQUE (release_id, id),
  UNIQUE (release_id, reference_code),
  FOREIGN KEY (release_id, parent_id) REFERENCES administrative_areas(release_id, id),
  CHECK (parent_id IS NULL OR parent_id <> id),
  CHECK (geometry IS NULL OR (ST_IsValid(geometry) AND NOT ST_IsEmpty(geometry)))
);
CREATE INDEX administrative_areas_geometry_idx ON administrative_areas USING gist(geometry);
CREATE INDEX administrative_areas_parent_idx ON administrative_areas(release_id, parent_id);
CREATE TABLE district_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES geography_releases,
  kind text NOT NULL CHECK (kind IN ('ncr_grouping', 'congressional', 'city_local')),
  name text NOT NULL,
  definition_source_url text NOT NULL,
  license_ref text NOT NULL,
  valid_from date,
  valid_to date,
  geometry geometry(MultiPolygon, 4326),
  UNIQUE (release_id, id),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
  CHECK (geometry IS NULL OR (ST_IsValid(geometry) AND NOT ST_IsEmpty(geometry)))
);
CREATE TABLE district_memberships (
  release_id uuid NOT NULL,
  district_id uuid NOT NULL,
  area_id uuid NOT NULL,
  membership_method text NOT NULL,
  PRIMARY KEY (district_id, area_id),
  FOREIGN KEY (release_id, district_id) REFERENCES district_definitions(release_id, id),
  FOREIGN KEY (release_id, area_id) REFERENCES administrative_areas(release_id, id)
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces, -- NULL: built-in category
  key text NOT NULL,
  label text NOT NULL,
  created_by uuid REFERENCES users
);
CREATE UNIQUE INDEX builtin_category_key ON categories(key) WHERE workspace_id IS NULL;
CREATE UNIQUE INDEX custom_category_key ON categories(workspace_id, key) WHERE workspace_id IS NOT NULL;
CREATE TABLE category_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories,
  source_id uuid NOT NULL REFERENCES sources,
  version integer NOT NULL CHECK (version > 0),
  source_schema_version text NOT NULL,
  structured_rule jsonb NOT NULL CHECK (jsonb_typeof(structured_rule) = 'object'),
  discovery_enabled boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  UNIQUE (category_id, source_id, version),
  UNIQUE (source_id, id),
  CHECK (NOT discovery_enabled OR verified_at IS NOT NULL)
);

CREATE TABLE scan_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces,
  source_id uuid NOT NULL REFERENCES sources,
  policy_id uuid NOT NULL,
  geography_release_id uuid NOT NULL REFERENCES geography_releases,
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  endpoint_ref text NOT NULL, -- configuration reference, never an API secret
  scope jsonb NOT NULL CHECK (jsonb_typeof(scope) = 'object'),
  max_requests integer NOT NULL CHECK (max_requests > 0),
  max_bytes bigint NOT NULL CHECK (max_bytes > 0),
  max_records integer NOT NULL CHECK (max_records > 0),
  max_spend_minor bigint NOT NULL DEFAULT 0 CHECK (max_spend_minor >= 0),
  currency text NOT NULL DEFAULT 'PHP' CHECK (currency ~ '^[A-Z]{3}$'),
  recurring_allowed boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  UNIQUE (workspace_id, id, source_id, policy_id, geography_release_id),
  FOREIGN KEY (source_id, policy_id) REFERENCES source_policies(source_id, id),
  FOREIGN KEY (workspace_id, approved_by) REFERENCES workspace_members(workspace_id, user_id),
  CHECK (expires_at > approved_at)
);
CREATE TABLE scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces,
  source_id uuid NOT NULL REFERENCES sources,
  policy_id uuid NOT NULL,
  permit_id uuid NOT NULL,
  geography_release_id uuid NOT NULL REFERENCES geography_releases,
  area_id uuid NOT NULL,
  district_id uuid,
  created_by uuid NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'queued', 'running', 'partial', 'completed', 'failed', 'cancelled')),
  bounded_scope jsonb NOT NULL CHECK (jsonb_typeof(bounded_scope) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  cancel_requested_at timestamptz,
  UNIQUE (workspace_id, id),
  UNIQUE (workspace_id, id, source_id, policy_id),
  UNIQUE (workspace_id, idempotency_key),
  FOREIGN KEY (workspace_id, permit_id, source_id, policy_id, geography_release_id)
    REFERENCES scan_permits(workspace_id, id, source_id, policy_id, geography_release_id),
  FOREIGN KEY (geography_release_id, area_id) REFERENCES administrative_areas(release_id, id),
  FOREIGN KEY (geography_release_id, district_id) REFERENCES district_definitions(release_id, id),
  FOREIGN KEY (workspace_id, created_by) REFERENCES workspace_members(workspace_id, user_id),
  CHECK (finished_at IS NULL OR (started_at IS NOT NULL AND finished_at >= started_at))
);
CREATE INDEX scans_history_idx ON scans(workspace_id, created_at DESC, id);
CREATE TABLE scan_categories (
  scan_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  source_id uuid NOT NULL,
  policy_id uuid NOT NULL,
  mapping_id uuid NOT NULL,
  PRIMARY KEY (scan_id, mapping_id),
  FOREIGN KEY (workspace_id, scan_id, source_id, policy_id)
    REFERENCES scans(workspace_id, id, source_id, policy_id),
  FOREIGN KEY (source_id, mapping_id) REFERENCES category_mappings(source_id, id)
);
CREATE TABLE scan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  scan_id uuid NOT NULL,
  task_key text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('discover', 'normalize', 'assess')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  queue_job_id uuid,
  error_code text, -- typed code, no provider payload or contacts
  next_attempt_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scan_id, task_key),
  FOREIGN KEY (workspace_id, scan_id) REFERENCES scans(workspace_id, id)
);
CREATE TABLE quota_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES sources,
  endpoint_ref text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  request_limit bigint NOT NULL CHECK (request_limit > 0),
  byte_limit bigint NOT NULL CHECK (byte_limit > 0),
  spend_limit_minor bigint NOT NULL CHECK (spend_limit_minor >= 0),
  reserved_requests bigint NOT NULL DEFAULT 0 CHECK (reserved_requests >= 0),
  used_requests bigint NOT NULL DEFAULT 0 CHECK (used_requests >= 0),
  reserved_bytes bigint NOT NULL DEFAULT 0 CHECK (reserved_bytes >= 0),
  used_bytes bigint NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  reserved_spend_minor bigint NOT NULL DEFAULT 0 CHECK (reserved_spend_minor >= 0),
  used_spend_minor bigint NOT NULL DEFAULT 0 CHECK (used_spend_minor >= 0),
  cooldown_until timestamptz,
  UNIQUE (source_id, endpoint_ref, window_start),
  CHECK (window_end > window_start)
  -- Serialize reservations with row locks. Actual bytes may exceed estimates;
  -- record that truth and suspend further requests rather than losing accounting.
);
CREATE TABLE source_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  scan_id uuid NOT NULL,
  quota_window_id uuid NOT NULL REFERENCES quota_windows,
  request_key text NOT NULL,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('reserved', 'sent', 'completed', 'failed', 'released')),
  response_bytes bigint CHECK (response_bytes >= 0),
  spend_minor bigint CHECK (spend_minor >= 0),
  http_status integer CHECK (http_status BETWEEN 100 AND 599),
  UNIQUE (scan_id, request_key),
  FOREIGN KEY (workspace_id, scan_id) REFERENCES scans(workspace_id, id)
);

CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (workspace_id, id)
  -- Identity only. Displayed business facts are selected from permitted facts.
);
CREATE TABLE source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces,
  source_id uuid NOT NULL REFERENCES sources,
  identity_namespace text NOT NULL, -- OSM: node/way/relation; provider namespace
  external_id text NOT NULL,
  identity_policy_id uuid NOT NULL,
  identity_expires_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source_id, identity_namespace, external_id),
  UNIQUE (workspace_id, id),
  UNIQUE (workspace_id, id, source_id),
  FOREIGN KEY (source_id, identity_policy_id) REFERENCES source_policies(source_id, id)
);
CREATE TABLE business_source_links (
  workspace_id uuid NOT NULL,
  business_id uuid NOT NULL,
  source_record_id uuid NOT NULL,
  linked_by uuid,
  method text NOT NULL CHECK (method IN ('source_identity', 'reviewed_match')),
  linked_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  PRIMARY KEY (business_id, source_record_id),
  FOREIGN KEY (workspace_id, business_id) REFERENCES businesses(workspace_id, id),
  FOREIGN KEY (workspace_id, source_record_id) REFERENCES source_records(workspace_id, id),
  FOREIGN KEY (workspace_id, linked_by) REFERENCES workspace_members(workspace_id, user_id)
);
CREATE UNIQUE INDEX active_source_link ON business_source_links(source_record_id) WHERE ended_at IS NULL;
CREATE TABLE source_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  source_id uuid NOT NULL,
  source_record_id uuid NOT NULL,
  policy_id uuid NOT NULL,
  scan_id uuid,
  observation_key text NOT NULL,
  source_release text,
  source_updated_at timestamptz,
  observed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  raw_storage_ref text,
  raw_expires_at timestamptz,
  UNIQUE (source_record_id, observation_key),
  UNIQUE (workspace_id, id, policy_id),
  FOREIGN KEY (workspace_id, source_record_id, source_id)
    REFERENCES source_records(workspace_id, id, source_id),
  FOREIGN KEY (source_id, policy_id) REFERENCES source_policies(source_id, id),
  FOREIGN KEY (workspace_id, scan_id, source_id, policy_id)
    REFERENCES scans(workspace_id, id, source_id, policy_id),
  CHECK (raw_storage_ref IS NULL OR raw_expires_at IS NOT NULL)
);
CREATE TABLE observation_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  observation_id uuid NOT NULL,
  policy_id uuid NOT NULL,
  field_key text NOT NULL,
  ordinal integer NOT NULL DEFAULT 0 CHECK (ordinal >= 0),
  value jsonb NOT NULL CHECK (jsonb_typeof(value) IN ('string', 'number', 'object', 'array', 'boolean')),
  expires_at timestamptz,
  transform_version text NOT NULL,
  UNIQUE (observation_id, field_key, ordinal),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, observation_id, policy_id)
    REFERENCES source_observations(workspace_id, id, policy_id) ON DELETE CASCADE,
  FOREIGN KEY (policy_id, field_key) REFERENCES policy_fields(policy_id, field_key)
  -- A field rule must exist; API/worker also verifies its allowed flags and TTL.
);
CREATE INDEX facts_retention_idx ON observation_facts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX business_name_lookup_idx ON observation_facts(workspace_id, lower(value #>> '{}'))
  WHERE field_key = 'name' AND jsonb_typeof(value) = 'string';
CREATE TABLE observed_locations (
  workspace_id uuid NOT NULL,
  fact_id uuid PRIMARY KEY,
  point geometry(Point, 4326) NOT NULL,
  method text NOT NULL CHECK (method IN ('source_point', 'representative_center', 'manual')),
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low', 'unknown')),
  FOREIGN KEY (workspace_id, fact_id) REFERENCES observation_facts(workspace_id, id) ON DELETE CASCADE,
  CHECK (ST_X(point) BETWEEN -180 AND 180 AND ST_Y(point) BETWEEN -90 AND 90),
  CHECK (NOT ST_IsEmpty(point))
);
CREATE INDEX observed_locations_point_idx ON observed_locations USING gist(point);
CREATE TABLE location_assignments (
  workspace_id uuid NOT NULL,
  location_fact_id uuid NOT NULL,
  geography_release_id uuid NOT NULL,
  area_id uuid NOT NULL,
  method text NOT NULL,
  review_required boolean NOT NULL DEFAULT true,
  PRIMARY KEY (location_fact_id, area_id),
  FOREIGN KEY (workspace_id, location_fact_id) REFERENCES observation_facts(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (geography_release_id, area_id) REFERENCES administrative_areas(release_id, id)
);
CREATE TABLE business_categories (
  workspace_id uuid NOT NULL,
  business_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES categories,
  evidence_fact_id uuid NOT NULL,
  mapping_id uuid REFERENCES category_mappings,
  PRIMARY KEY (business_id, category_id, evidence_fact_id),
  FOREIGN KEY (workspace_id, business_id) REFERENCES businesses(workspace_id, id),
  FOREIGN KEY (workspace_id, evidence_fact_id) REFERENCES observation_facts(workspace_id, id) ON DELETE CASCADE
);
CREATE TABLE scan_results (
  workspace_id uuid NOT NULL,
  scan_id uuid NOT NULL,
  business_id uuid NOT NULL,
  first_discovered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scan_id, business_id),
  FOREIGN KEY (workspace_id, scan_id) REFERENCES scans(workspace_id, id),
  FOREIGN KEY (workspace_id, business_id) REFERENCES businesses(workspace_id, id)
);

CREATE TABLE website_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  business_id uuid NOT NULL,
  fact_id uuid NOT NULL,
  evidence_kind text NOT NULL CHECK (evidence_kind IN (
    'business_url', 'social_profile', 'platform_url', 'missing_source_field', 'manual_review')),
  url text,
  observed_at timestamptz NOT NULL,
  expires_at timestamptz,
  UNIQUE (workspace_id, id, business_id),
  FOREIGN KEY (workspace_id, business_id) REFERENCES businesses(workspace_id, id),
  FOREIGN KEY (workspace_id, fact_id) REFERENCES observation_facts(workspace_id, id) ON DELETE CASCADE,
  CHECK (evidence_kind NOT IN ('business_url', 'social_profile', 'platform_url') OR url IS NOT NULL)
);
CREATE TABLE website_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  business_id uuid NOT NULL,
  classification text NOT NULL DEFAULT 'not_assessed' CHECK (classification IN (
    'not_assessed', 'no_website', 'existing_website', 'website_unavailable',
    'needs_review', 'social_media_only')),
  reason_code text NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low', 'unknown')),
  assessment_version text NOT NULL,
  evaluated_at timestamptz NOT NULL,
  review_due_at timestamptz NOT NULL,
  expires_at timestamptz,
  human_reviewer_id uuid,
  review_scope text,
  UNIQUE (workspace_id, id, business_id),
  FOREIGN KEY (workspace_id, business_id) REFERENCES businesses(workspace_id, id),
  FOREIGN KEY (workspace_id, human_reviewer_id) REFERENCES workspace_members(workspace_id, user_id),
  CHECK (review_due_at > evaluated_at),
  CHECK (classification <> 'no_website' OR (human_reviewer_id IS NOT NULL AND review_scope IS NOT NULL))
);
CREATE TABLE assessment_inputs (
  workspace_id uuid NOT NULL,
  business_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  PRIMARY KEY (assessment_id, evidence_id),
  FOREIGN KEY (workspace_id, assessment_id, business_id)
    REFERENCES website_assessments(workspace_id, id, business_id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, evidence_id, business_id)
    REFERENCES website_evidence(workspace_id, id, business_id) ON DELETE CASCADE
);
CREATE TABLE website_check_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces,
  source_id uuid NOT NULL REFERENCES sources,
  policy_id uuid NOT NULL,
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  max_urls integer NOT NULL CHECK (max_urls > 0),
  max_attempts_per_url integer NOT NULL CHECK (max_attempts_per_url > 0),
  max_response_bytes bigint NOT NULL CHECK (max_response_bytes > 0),
  revoked_at timestamptz,
  UNIQUE (workspace_id, id),
  FOREIGN KEY (source_id, policy_id) REFERENCES source_policies(source_id, id),
  FOREIGN KEY (workspace_id, approved_by) REFERENCES workspace_members(workspace_id, user_id),
  CHECK (expires_at > approved_at)
);
CREATE TABLE website_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  business_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  check_permit_id uuid NOT NULL,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  checked_at timestamptz NOT NULL,
  outcome text NOT NULL CHECK (outcome IN (
    'reachable', 'dns_error', 'tls_error', 'timeout', 'http_error', 'rate_limited',
    'access_blocked', 'unsafe_destination', 'redirect_limit', 'inconclusive')),
  http_status integer CHECK (http_status BETWEEN 100 AND 599),
  duration_ms integer CHECK (duration_ms >= 0),
  redirect_count integer NOT NULL DEFAULT 0 CHECK (redirect_count >= 0),
  UNIQUE (assessment_id, attempt_number),
  FOREIGN KEY (workspace_id, check_permit_id) REFERENCES website_check_permits(workspace_id, id),
  FOREIGN KEY (workspace_id, assessment_id, business_id)
    REFERENCES website_assessments(workspace_id, id, business_id) ON DELETE CASCADE
  -- No HTML body, DNS payload, credentials, or remote response header archive.
);
CREATE TABLE opportunity_rankings (
  workspace_id uuid NOT NULL,
  business_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  ranking_version text NOT NULL,
  tier smallint NOT NULL CHECK (tier BETWEEN 0 AND 5),
  reason_code text NOT NULL,
  calculated_at timestamptz NOT NULL,
  PRIMARY KEY (business_id, ranking_version),
  FOREIGN KEY (workspace_id, assessment_id, business_id)
    REFERENCES website_assessments(workspace_id, id, business_id) ON DELETE CASCADE
);
CREATE INDEX opportunity_sort_idx ON opportunity_rankings(workspace_id, ranking_version, tier, business_id);

CREATE TABLE prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  business_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'researching', 'qualified', 'contacted', 'won', 'lost', 'do_not_contact', 'archived')),
  assigned_to uuid,
  created_by uuid NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, business_id),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, business_id) REFERENCES businesses(workspace_id, id),
  FOREIGN KEY (workspace_id, assigned_to) REFERENCES workspace_members(workspace_id, user_id),
  FOREIGN KEY (workspace_id, created_by) REFERENCES workspace_members(workspace_id, user_id)
);
CREATE TABLE prospect_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  prospect_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, prospect_id) REFERENCES prospects(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, author_id) REFERENCES workspace_members(workspace_id, user_id)
);
CREATE TABLE export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces,
  requested_by uuid NOT NULL,
  format text NOT NULL CHECK (format IN ('csv_zip', 'xlsx_bundle')),
  dataset_kind text NOT NULL CHECK (dataset_kind IN ('source_derived', 'operator_crm', 'combined_reviewed')),
  recipient_scope text NOT NULL,
  request_filter jsonb NOT NULL CHECK (jsonb_typeof(request_filter) = 'object'),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'running', 'completed', 'failed', 'cancelled', 'expired', 'revoked')),
  idempotency_key text NOT NULL,
  object_ref text,
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id),
  UNIQUE (workspace_id, idempotency_key),
  FOREIGN KEY (workspace_id, requested_by) REFERENCES workspace_members(workspace_id, user_id),
  CHECK (status <> 'completed' OR (object_ref IS NOT NULL AND expires_at IS NOT NULL))
);
CREATE TABLE export_inputs (
  workspace_id uuid NOT NULL,
  export_id uuid NOT NULL,
  fact_id uuid NOT NULL,
  PRIMARY KEY (export_id, fact_id),
  FOREIGN KEY (workspace_id, export_id) REFERENCES export_jobs(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, fact_id) REFERENCES observation_facts(workspace_id, id)
  -- Revoke/remove export objects before deleting dependent facts.
);
CREATE TABLE deletion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces,
  source_id uuid REFERENCES sources,
  target_kind text NOT NULL,
  target_id uuid NOT NULL,
  reason_code text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  restore_tombstone_until timestamptz,
  UNIQUE (workspace_id, target_kind, target_id, reason_code)
  -- Retain minimal app identifiers only where permitted, never deleted content.
);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces,
  actor_id uuid,
  action text NOT NULL,
  entity_kind text NOT NULL,
  entity_id uuid,
  reason_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, actor_id) REFERENCES workspace_members(workspace_id, user_id)
  -- No old/new contact values, note bodies, or provider payloads in this log.
);
CREATE INDEX audit_events_workspace_idx ON audit_events(workspace_id, created_at DESC);
COMMIT;
