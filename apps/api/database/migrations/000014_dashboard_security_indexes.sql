CREATE INDEX site_members_dashboard_access_idx
  ON site_members (user_id, site_id, role_id);

CREATE INDEX sites_dashboard_organization_status_idx
  ON sites (organization_id, status, id);

CREATE INDEX phases_dashboard_site_status_deadline_idx
  ON phases (site_id, status, estimated_end_date, start_date);

CREATE INDEX tasks_dashboard_site_status_due_date_idx
  ON tasks (site_id, status, due_date);

CREATE INDEX ai_alerts_dashboard_open_site_severity_idx
  ON ai_alerts (site_id, severity, detected_at DESC)
  WHERE resolved_at IS NULL AND status <> 'resolved';

CREATE INDEX organization_audit_logs_dashboard_action_idx
  ON organization_audit_logs (organization_id, action, created_at DESC);
