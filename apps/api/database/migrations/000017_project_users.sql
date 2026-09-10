ALTER TABLE sites ADD CONSTRAINT sites_id_organization_unique UNIQUE (id, organization_id);
ALTER TABLE users ADD CONSTRAINT users_id_organization_unique UNIQUE (id, organization_id);

CREATE TABLE project_users (
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id, organization_id)
    REFERENCES sites(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id, organization_id)
    REFERENCES users(id, organization_id) ON DELETE CASCADE
);

CREATE INDEX project_users_user_id_idx ON project_users (user_id);

INSERT INTO project_users (project_id, user_id, organization_id, created_at)
SELECT sm.site_id, sm.user_id, s.organization_id, MIN(sm.created_at)
FROM site_members sm
JOIN sites s ON s.id = sm.site_id
JOIN users u ON u.id = sm.user_id AND u.organization_id = s.organization_id
GROUP BY sm.site_id, sm.user_id, s.organization_id;
