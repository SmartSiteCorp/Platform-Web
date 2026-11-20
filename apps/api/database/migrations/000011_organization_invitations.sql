CREATE TABLE organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email varchar(320) NOT NULL,
  token_hash text NOT NULL UNIQUE,
  invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_invitations_email_not_empty CHECK (length(trim(email)) > 0)
);

CREATE TABLE organization_invitation_roles (
  invitation_id uuid NOT NULL REFERENCES organization_invitations(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invitation_id, role_id)
);

CREATE INDEX organization_invitations_organization_email_idx
  ON organization_invitations (organization_id, lower(email));

CREATE INDEX organization_invitations_expires_at_idx
  ON organization_invitations (expires_at);

CREATE INDEX organization_invitation_roles_role_id_idx
  ON organization_invitation_roles (role_id);
