CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  category file_category NOT NULL,
  original_name varchar(255) NOT NULL,
  mime_type varchar(160) NOT NULL,
  storage_provider varchar(80) NOT NULL,
  container_name varchar(180) NOT NULL,
  blob_path text NOT NULL,
  public_url text,
  size_bytes bigint NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT files_size_positive CHECK (size_bytes >= 0)
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  title varchar(180) NOT NULL,
  document_type varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE task_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  photo_file_id uuid NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE task_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  photo_file_id uuid NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  comment text NOT NULL,
  status varchar(60) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX files_organization_id_idx ON files (organization_id);
CREATE INDEX files_site_id_idx ON files (site_id);
CREATE INDEX files_uploaded_by_idx ON files (uploaded_by);
CREATE INDEX documents_site_id_idx ON documents (site_id);
CREATE INDEX documents_file_id_idx ON documents (file_id);
CREATE INDEX task_proofs_task_id_idx ON task_proofs (task_id);
CREATE INDEX task_issues_task_id_idx ON task_issues (task_id);
