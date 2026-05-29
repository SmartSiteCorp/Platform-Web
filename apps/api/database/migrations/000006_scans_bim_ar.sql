CREATE TABLE scan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  app_name varchar(120) NOT NULL,
  scan_type varchar(80) NOT NULL,
  device_type varchar(80) NOT NULL,
  room_name varchar(180),
  status scan_status NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE scans_3d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  scan_session_id uuid REFERENCES scan_sessions(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source varchar(80) NOT NULL,
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  format varchar(40) NOT NULL,
  room varchar(180),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE floor_plans_2d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  scan_session_id uuid REFERENCES scan_sessions(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  room_name varchar(180),
  format varchar(40) NOT NULL,
  scale varchar(80),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bim_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  version varchar(80) NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ar_anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  anchor_type varchar(80) NOT NULL,
  position jsonb NOT NULL DEFAULT '{}'::jsonb,
  qr_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ar_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  bim_model_id uuid REFERENCES bim_models(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  position jsonb NOT NULL DEFAULT '{}'::jsonb,
  title varchar(180) NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX scan_sessions_site_id_idx ON scan_sessions (site_id);
CREATE INDEX scans_3d_site_id_idx ON scans_3d (site_id);
CREATE INDEX floor_plans_2d_site_id_idx ON floor_plans_2d (site_id);
CREATE INDEX bim_models_site_id_idx ON bim_models (site_id);
CREATE INDEX ar_anchors_site_id_idx ON ar_anchors (site_id);
CREATE INDEX ar_annotations_site_id_idx ON ar_annotations (site_id);
