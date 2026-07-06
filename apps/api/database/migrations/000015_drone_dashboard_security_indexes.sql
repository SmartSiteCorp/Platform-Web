CREATE INDEX drone_missions_dashboard_dronist_site_status_date_idx
  ON drone_missions (dronist_id, site_id, status, mission_date);

CREATE INDEX drone_missions_dashboard_site_dronist_idx
  ON drone_missions (site_id, dronist_id);

CREATE INDEX flights_dashboard_mission_status_date_idx
  ON flights (drone_mission_id, status, planned_date DESC, created_at DESC);

CREATE INDEX devices_dashboard_organization_type_idx
  ON devices (organization_id, type, id);
