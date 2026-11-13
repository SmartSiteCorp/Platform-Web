DO $$
BEGIN
  CREATE TYPE architect_request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE architect_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  mission_description text,
  requested_date date,
  status architect_request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT architect_requests_mission_description_not_blank
    CHECK (mission_description IS NULL OR length(btrim(mission_description)) > 0)
);

CREATE INDEX architect_requests_site_id_idx ON architect_requests (site_id);
CREATE INDEX architect_requests_organization_id_idx ON architect_requests (organization_id);
CREATE INDEX architect_requests_requested_by_idx ON architect_requests (requested_by);
