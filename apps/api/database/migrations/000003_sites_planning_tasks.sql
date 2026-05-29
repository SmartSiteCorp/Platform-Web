CREATE TABLE sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name varchar(180) NOT NULL,
  description text,
  address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  start_date date,
  estimated_end_date date,
  estimated_duration_days integer,
  status site_status NOT NULL DEFAULT 'planned',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE site_members (
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, user_id, role_id)
);

CREATE TABLE phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name varchar(180) NOT NULL,
  description text,
  position integer NOT NULL,
  start_date date,
  estimated_end_date date,
  estimated_duration_days integer,
  progress_percent numeric(5, 2) NOT NULL DEFAULT 0,
  status phase_status NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT phases_position_per_site_unique UNIQUE (site_id, position),
  CONSTRAINT phases_progress_range CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES phases(id) ON DELETE SET NULL,
  title varchar(180) NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'todo',
  due_date date,
  completed_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE task_assignments (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX sites_organization_id_idx ON sites (organization_id);
CREATE INDEX site_members_user_id_idx ON site_members (user_id);
CREATE INDEX phases_site_id_idx ON phases (site_id);
CREATE INDEX tasks_site_id_idx ON tasks (site_id);
CREATE INDEX tasks_phase_id_idx ON tasks (phase_id);
CREATE INDEX task_assignments_user_id_idx ON task_assignments (user_id);
