DO $$
BEGIN
  CREATE TYPE drone_request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE drone_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  mission_description text,
  requested_date date,
  status drone_request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drone_requests_mission_description_not_blank
    CHECK (mission_description IS NULL OR length(btrim(mission_description)) > 0)
);

CREATE INDEX drone_requests_site_id_idx ON drone_requests (site_id);
CREATE INDEX drone_requests_organization_id_idx ON drone_requests (organization_id);
CREATE INDEX drone_requests_requested_by_idx ON drone_requests (requested_by);
