ALTER TABLE conversations
  ALTER COLUMN has_image TYPE boolean USING (has_image IS NOT NULL AND has_image <> 0),
  ALTER COLUMN has_image SET DEFAULT false;

ALTER TABLE knowledge_graph
  ALTER COLUMN confidence TYPE numeric(5,2) USING confidence::numeric,
  ALTER COLUMN confidence SET DEFAULT 100;

ALTER TABLE performance_metrics
  ALTER COLUMN average_time_ms TYPE numeric(12,2) USING average_time_ms::numeric,
  ALTER COLUMN best_time_ms TYPE numeric(12,2) USING best_time_ms::numeric,
  ALTER COLUMN improvement_rate TYPE numeric(8,4) USING improvement_rate::numeric,
  ALTER COLUMN success_rate TYPE numeric(5,2) USING success_rate::numeric;

ALTER TABLE health_device_connections
  ALTER COLUMN is_active TYPE boolean USING (is_active IS NOT NULL AND is_active <> 0),
  ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE health_activity
  ALTER COLUMN distance TYPE numeric(12,3) USING distance::numeric;

ALTER TABLE health_body_metrics
  ALTER COLUMN weight TYPE numeric(8,2) USING weight::numeric,
  ALTER COLUMN body_fat TYPE numeric(5,2) USING body_fat::numeric,
  ALTER COLUMN muscle_mass TYPE numeric(8,2) USING muscle_mass::numeric,
  ALTER COLUMN bone_mass TYPE numeric(8,2) USING bone_mass::numeric,
  ALTER COLUMN bmi TYPE numeric(5,2) USING bmi::numeric,
  ALTER COLUMN hydration TYPE numeric(5,2) USING hydration::numeric;

ALTER TABLE location_records
  ALTER COLUMN latitude TYPE numeric(10,7) USING latitude::numeric,
  ALTER COLUMN longitude TYPE numeric(10,7) USING longitude::numeric,
  ALTER COLUMN accuracy TYPE numeric(10,3) USING accuracy::numeric,
  ALTER COLUMN altitude TYPE numeric(10,3) USING NULLIF(altitude, '')::numeric,
  ALTER COLUMN speed TYPE numeric(10,3) USING NULLIF(speed, '')::numeric,
  ALTER COLUMN heading TYPE numeric(10,3) USING NULLIF(heading, '')::numeric;

ALTER TABLE emergency_alerts
  ALTER COLUMN latitude TYPE numeric(10,7) USING latitude::numeric,
  ALTER COLUMN longitude TYPE numeric(10,7) USING longitude::numeric;

ALTER TABLE location_shares_v2
  ALTER COLUMN is_active TYPE boolean USING (is_active IS NOT NULL AND is_active <> 0),
  ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE tracked_users
  ALTER COLUMN last_lat TYPE numeric(10,7) USING NULLIF(last_lat, '')::numeric,
  ALTER COLUMN last_lon TYPE numeric(10,7) USING NULLIF(last_lon, '')::numeric,
  ALTER COLUMN last_accuracy TYPE numeric(10,3) USING NULLIF(last_accuracy, '')::numeric,
  ALTER COLUMN last_speed TYPE numeric(10,3) USING NULLIF(last_speed, '')::numeric,
  ALTER COLUMN last_heading TYPE numeric(10,3) USING NULLIF(last_heading, '')::numeric;

CREATE TABLE IF NOT EXISTS api_keys (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  key_name text NOT NULL,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  auth_tag text NOT NULL,
  metadata jsonb,
  created_by varchar,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decision_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar,
  source text NOT NULL,
  decision_type text NOT NULL,
  input text NOT NULL,
  output text NOT NULL,
  confidence numeric(5,2) DEFAULT 0,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mission_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id varchar NOT NULL,
  user_id varchar,
  status text NOT NULL,
  summary text NOT NULL,
  details jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_runs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by varchar,
  source_type text NOT NULL,
  item_count integer NOT NULL DEFAULT 0,
  status text NOT NULL,
  summary text,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);