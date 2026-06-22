CREATE TABLE organization_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(80) NOT NULL,
  changed_fields varchar(80)[] NOT NULL DEFAULT ARRAY[]::varchar[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX organization_audit_logs_organization_id_created_at_idx
  ON organization_audit_logs (organization_id, created_at DESC);

CREATE INDEX organization_audit_logs_actor_user_id_idx
  ON organization_audit_logs (actor_user_id);
