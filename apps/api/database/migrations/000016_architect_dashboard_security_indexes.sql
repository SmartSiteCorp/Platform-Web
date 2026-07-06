CREATE INDEX bim_models_dashboard_site_created_at_idx
  ON bim_models (site_id, created_at DESC, id);

CREATE INDEX ar_annotations_dashboard_site_created_at_idx
  ON ar_annotations (site_id, created_at DESC, id);

CREATE INDEX files_dashboard_bim_organization_site_idx
  ON files (organization_id, site_id, id)
  WHERE category = 'bim_ifc';
