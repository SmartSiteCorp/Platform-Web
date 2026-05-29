CREATE TABLE ai_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  source_file_id uuid REFERENCES files(id) ON DELETE SET NULL,
  type varchar(100) NOT NULL,
  severity alert_severity NOT NULL,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text NOT NULL,
  recommendation text,
  status varchar(60) NOT NULL DEFAULT 'open',
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE ai_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  predicted_end_date date,
  delay_risk_percent numeric(5, 2) NOT NULL DEFAULT 0,
  confidence_percent numeric(5, 2) NOT NULL DEFAULT 0,
  input_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_predictions_delay_range CHECK (delay_risk_percent >= 0 AND delay_risk_percent <= 100),
  CONSTRAINT ai_predictions_confidence_range CHECK (confidence_percent >= 0 AND confidence_percent <= 100)
);

CREATE TABLE datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(180) NOT NULL,
  dataset_type varchar(80) NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dataset_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  annotation_type varchar(80) NOT NULL,
  coordinates jsonb NOT NULL DEFAULT '{}'::jsonb,
  label varchar(120) NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  scan_session_id uuid REFERENCES scan_sessions(id) ON DELETE SET NULL,
  file_id uuid REFERENCES files(id) ON DELETE SET NULL,
  job_type varchar(100) NOT NULL,
  status varchar(60) NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  logs text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE partner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  partner_type varchar(80) NOT NULL,
  status partner_request_status NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  title varchar(180) NOT NULL,
  message text NOT NULL,
  type varchar(80) NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_alerts_site_id_idx ON ai_alerts (site_id);
CREATE INDEX ai_predictions_site_id_idx ON ai_predictions (site_id);
CREATE INDEX datasets_created_by_idx ON datasets (created_by);
CREATE INDEX dataset_annotations_dataset_id_idx ON dataset_annotations (dataset_id);
CREATE INDEX processing_jobs_site_id_idx ON processing_jobs (site_id);
CREATE INDEX partner_requests_site_id_idx ON partner_requests (site_id);
CREATE INDEX notifications_user_id_idx ON notifications (user_id);
CREATE INDEX notifications_site_id_idx ON notifications (site_id);
