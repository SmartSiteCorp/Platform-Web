export const architectProjectSummariesQuery = `
  WITH authorized_sites AS (
    SELECT sites.id, sites.name, sites.address, sites.status
    FROM sites
    WHERE sites.organization_id = $1
      AND ($3::uuid IS NULL OR sites.id = $3::uuid)
      AND EXISTS (
        SELECT 1
        FROM site_members
        INNER JOIN roles ON roles.id = site_members.role_id
        WHERE site_members.site_id = sites.id
          AND site_members.user_id = $2
          AND roles.code = ANY($4::varchar[])
      )
  ),
  bim_metrics AS (
    SELECT bim_models.site_id, COUNT(*)::int AS ifc_model_count
    FROM bim_models
    INNER JOIN authorized_sites ON authorized_sites.id = bim_models.site_id
    GROUP BY bim_models.site_id
  ),
  annotation_metrics AS (
    SELECT ar_annotations.site_id, COUNT(*)::int AS recent_annotations_count
    FROM ar_annotations
    INNER JOIN authorized_sites ON authorized_sites.id = ar_annotations.site_id
    GROUP BY ar_annotations.site_id
  ),
  ai_metrics AS (
    SELECT
      ai_alerts.site_id,
      COUNT(*)::int AS active_ai_anomalies_count,
      COUNT(*) FILTER (WHERE ai_alerts.severity = 'critical')::int AS critical_ai_anomalies_count
    FROM ai_alerts
    INNER JOIN authorized_sites ON authorized_sites.id = ai_alerts.site_id
    WHERE ai_alerts.resolved_at IS NULL
      AND ai_alerts.status <> 'resolved'
    GROUP BY ai_alerts.site_id
  )
  SELECT
    authorized_sites.id,
    authorized_sites.name,
    authorized_sites.address,
    authorized_sites.status,
    COALESCE(bim_metrics.ifc_model_count, 0) AS ifc_model_count,
    COALESCE(annotation_metrics.recent_annotations_count, 0) AS recent_annotations_count,
    COALESCE(ai_metrics.active_ai_anomalies_count, 0) AS active_ai_anomalies_count,
    COALESCE(ai_metrics.critical_ai_anomalies_count, 0) AS critical_ai_anomalies_count,
    latest_ifc.id AS latest_ifc_model_id,
    latest_ifc.version AS latest_ifc_version,
    latest_ifc.created_at AS latest_ifc_created_at,
    latest_ifc.file_id AS latest_ifc_file_id,
    latest_ifc.file_name AS latest_ifc_file_name,
    latest_ifc.file_metadata AS latest_ifc_file_metadata
  FROM authorized_sites
  LEFT JOIN bim_metrics ON bim_metrics.site_id = authorized_sites.id
  LEFT JOIN annotation_metrics ON annotation_metrics.site_id = authorized_sites.id
  LEFT JOIN ai_metrics ON ai_metrics.site_id = authorized_sites.id
  LEFT JOIN LATERAL (
    SELECT
      bim_models.id,
      bim_models.version,
      bim_models.created_at,
      files.id AS file_id,
      files.original_name AS file_name,
      files.metadata AS file_metadata
    FROM bim_models
    INNER JOIN files ON files.id = bim_models.file_id
    WHERE bim_models.site_id = authorized_sites.id
      AND files.organization_id = $1
      AND (files.site_id IS NULL OR files.site_id = authorized_sites.id)
    ORDER BY bim_models.created_at DESC, bim_models.id ASC
    LIMIT 1
  ) latest_ifc ON TRUE
  ORDER BY
    latest_ifc.created_at DESC NULLS LAST,
    authorized_sites.name ASC,
    authorized_sites.id ASC
`;

export const architectIfcModelsQuery = `
  WITH authorized_sites AS (
    SELECT sites.id, sites.name
    FROM sites
    WHERE sites.organization_id = $1
      AND ($3::uuid IS NULL OR sites.id = $3::uuid)
      AND EXISTS (
        SELECT 1
        FROM site_members
        INNER JOIN roles ON roles.id = site_members.role_id
        WHERE site_members.site_id = sites.id
          AND site_members.user_id = $2
          AND roles.code = ANY($4::varchar[])
      )
  )
  SELECT
    bim_models.id,
    bim_models.site_id,
    authorized_sites.name AS site_name,
    bim_models.file_id,
    files.original_name AS file_name,
    bim_models.version,
    bim_models.notes,
    files.metadata AS file_metadata,
    bim_models.created_at
  FROM bim_models
  INNER JOIN authorized_sites ON authorized_sites.id = bim_models.site_id
  INNER JOIN files ON files.id = bim_models.file_id
  WHERE files.organization_id = $1
    AND (files.site_id IS NULL OR files.site_id = bim_models.site_id)
  ORDER BY bim_models.created_at DESC, bim_models.id ASC
  LIMIT 8
`;

export const architectAnnotationsQuery = `
  WITH authorized_sites AS (
    SELECT sites.id, sites.name
    FROM sites
    WHERE sites.organization_id = $1
      AND ($3::uuid IS NULL OR sites.id = $3::uuid)
      AND EXISTS (
        SELECT 1
        FROM site_members
        INNER JOIN roles ON roles.id = site_members.role_id
        WHERE site_members.site_id = sites.id
          AND site_members.user_id = $2
          AND roles.code = ANY($4::varchar[])
      )
  )
  SELECT
    ar_annotations.id,
    ar_annotations.site_id,
    authorized_sites.name AS site_name,
    ar_annotations.bim_model_id,
    ar_annotations.title,
    ar_annotations.comment,
    ar_annotations.created_at
  FROM ar_annotations
  INNER JOIN authorized_sites ON authorized_sites.id = ar_annotations.site_id
  ORDER BY ar_annotations.created_at DESC, ar_annotations.id ASC
  LIMIT 8
`;

export const architectAiAnomaliesQuery = `
  WITH authorized_sites AS (
    SELECT sites.id, sites.name
    FROM sites
    WHERE sites.organization_id = $1
      AND ($3::uuid IS NULL OR sites.id = $3::uuid)
      AND EXISTS (
        SELECT 1
        FROM site_members
        INNER JOIN roles ON roles.id = site_members.role_id
        WHERE site_members.site_id = sites.id
          AND site_members.user_id = $2
          AND roles.code = ANY($4::varchar[])
      )
  )
  SELECT
    ai_alerts.id,
    ai_alerts.site_id,
    authorized_sites.name AS site_name,
    ai_alerts.type,
    ai_alerts.severity,
    ai_alerts.description,
    ai_alerts.recommendation,
    ai_alerts.status,
    ai_alerts.detected_at
  FROM ai_alerts
  INNER JOIN authorized_sites ON authorized_sites.id = ai_alerts.site_id
  WHERE ai_alerts.resolved_at IS NULL
    AND ai_alerts.status <> 'resolved'
  ORDER BY
    ai_alerts.severity = 'critical' DESC,
    ai_alerts.severity = 'high' DESC,
    ai_alerts.detected_at DESC,
    ai_alerts.id ASC
  LIMIT 8
`;
