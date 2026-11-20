ALTER TABLE phases
  ADD CONSTRAINT phases_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT phases_position_positive CHECK (position > 0),
  ADD CONSTRAINT phases_estimated_duration_days_positive
    CHECK (estimated_duration_days IS NULL OR estimated_duration_days >= 1);

INSERT INTO site_members (site_id, user_id, role_id)
SELECT sites.id, sites.created_by, roles.id
FROM sites
INNER JOIN users ON users.id = sites.created_by
INNER JOIN user_roles ON user_roles.user_id = users.id
INNER JOIN roles ON roles.id = user_roles.role_id
WHERE roles.code IN ('chef_chantier', 'administrateur')
ON CONFLICT DO NOTHING;
