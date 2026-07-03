export const siteManagerSiteSummariesQuery = `
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
  phase_metrics AS (
    SELECT
      phases.site_id,
      COUNT(*)::int AS phase_count,
      ROUND(AVG(phases.progress_percent), 2)::text AS phase_progress_percent
    FROM phases
    INNER JOIN authorized_sites ON authorized_sites.id = phases.site_id
    WHERE phases.status <> 'cancelled'
    GROUP BY phases.site_id
  ),
  task_metrics AS (
    SELECT
      tasks.site_id,
      COUNT(*)::int AS task_total_count,
      COUNT(*) FILTER (WHERE tasks.status = 'in_progress')::int AS task_in_progress_count,
      COUNT(*) FILTER (WHERE tasks.status = 'completed')::int AS task_completed_count
    FROM tasks
    INNER JOIN authorized_sites ON authorized_sites.id = tasks.site_id
    WHERE tasks.status <> 'cancelled'
    GROUP BY tasks.site_id
  ),
  worker_metrics AS (
    SELECT
      site_members.site_id,
      COUNT(DISTINCT site_members.user_id)::int AS active_workers_count
    FROM site_members
    INNER JOIN authorized_sites ON authorized_sites.id = site_members.site_id
    INNER JOIN roles ON roles.id = site_members.role_id
    INNER JOIN users ON users.id = site_members.user_id
    WHERE roles.code = 'ouvrier'
      AND users.status = 'active'
    GROUP BY site_members.site_id
  ),
  alert_metrics AS (
    SELECT
      ai_alerts.site_id,
      COUNT(*)::int AS active_alerts_count,
      COUNT(*) FILTER (WHERE ai_alerts.severity = 'critical')::int AS critical_alerts_count
    FROM ai_alerts
    INNER JOIN authorized_sites ON authorized_sites.id = ai_alerts.site_id
    WHERE ai_alerts.resolved_at IS NULL
      AND ai_alerts.status <> 'resolved'
    GROUP BY ai_alerts.site_id
  ),
  deadline_candidates AS (
    SELECT tasks.site_id, tasks.due_date AS due_date
    FROM tasks
    INNER JOIN authorized_sites ON authorized_sites.id = tasks.site_id
    WHERE tasks.due_date IS NOT NULL
      AND tasks.status NOT IN ('completed', 'cancelled')
    UNION ALL
    SELECT
      phases.site_id,
      COALESCE(
        phases.estimated_end_date,
        CASE
          WHEN phases.start_date IS NOT NULL AND phases.estimated_duration_days IS NOT NULL
          THEN (phases.start_date + phases.estimated_duration_days * interval '1 day')::date
          ELSE NULL
        END
      ) AS due_date
    FROM phases
    INNER JOIN authorized_sites ON authorized_sites.id = phases.site_id
    WHERE phases.status NOT IN ('completed', 'cancelled')
    UNION ALL
    SELECT
      authorized_sites.id AS site_id,
      COALESCE(
        sites.estimated_end_date,
        CASE
          WHEN sites.start_date IS NOT NULL AND sites.estimated_duration_days IS NOT NULL
          THEN (sites.start_date + sites.estimated_duration_days * interval '1 day')::date
          ELSE NULL
        END
      ) AS due_date
    FROM sites
    INNER JOIN authorized_sites ON authorized_sites.id = sites.id
    WHERE sites.status NOT IN ('completed', 'cancelled')
  ),
  deadline_metrics AS (
    SELECT
      deadline_candidates.site_id,
      MIN(deadline_candidates.due_date)::text AS next_deadline_at
    FROM deadline_candidates
    WHERE deadline_candidates.due_date IS NOT NULL
    GROUP BY deadline_candidates.site_id
  )
  SELECT
    authorized_sites.id,
    authorized_sites.name,
    authorized_sites.address,
    authorized_sites.status,
    CASE
      WHEN COALESCE(phase_metrics.phase_count, 0) > 0
        THEN COALESCE(phase_metrics.phase_progress_percent, '0')
      WHEN COALESCE(task_metrics.task_total_count, 0) > 0
        THEN ROUND(
          COALESCE(task_metrics.task_completed_count, 0)::numeric * 100
          / task_metrics.task_total_count,
          2
        )::text
      ELSE '0'
    END AS progress_percent,
    COALESCE(task_metrics.task_total_count, 0) AS task_total_count,
    COALESCE(task_metrics.task_in_progress_count, 0) AS task_in_progress_count,
    COALESCE(task_metrics.task_completed_count, 0) AS task_completed_count,
    COALESCE(worker_metrics.active_workers_count, 0) AS active_workers_count,
    COALESCE(alert_metrics.active_alerts_count, 0) AS active_alerts_count,
    COALESCE(alert_metrics.critical_alerts_count, 0) AS critical_alerts_count,
    deadline_metrics.next_deadline_at
  FROM authorized_sites
  LEFT JOIN phase_metrics ON phase_metrics.site_id = authorized_sites.id
  LEFT JOIN task_metrics ON task_metrics.site_id = authorized_sites.id
  LEFT JOIN worker_metrics ON worker_metrics.site_id = authorized_sites.id
  LEFT JOIN alert_metrics ON alert_metrics.site_id = authorized_sites.id
  LEFT JOIN deadline_metrics ON deadline_metrics.site_id = authorized_sites.id
  ORDER BY
    authorized_sites.status = 'in_progress' DESC,
    authorized_sites.name ASC,
    authorized_sites.id ASC
`;

export const siteManagerAlertsQuery = `
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

export const siteManagerDeadlinesQuery = `
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
  ),
  deadline_candidates AS (
    SELECT
      tasks.id,
      tasks.site_id,
      authorized_sites.name AS site_name,
      'task'::text AS kind,
      tasks.title AS label,
      tasks.status::text AS status,
      tasks.due_date::text AS due_date
    FROM tasks
    INNER JOIN authorized_sites ON authorized_sites.id = tasks.site_id
    WHERE tasks.due_date IS NOT NULL
      AND tasks.status NOT IN ('completed', 'cancelled')
    UNION ALL
    SELECT
      phases.id,
      phases.site_id,
      authorized_sites.name AS site_name,
      'phase'::text AS kind,
      phases.name AS label,
      phases.status::text AS status,
      COALESCE(
        phases.estimated_end_date,
        CASE
          WHEN phases.start_date IS NOT NULL AND phases.estimated_duration_days IS NOT NULL
          THEN (phases.start_date + phases.estimated_duration_days * interval '1 day')::date
          ELSE NULL
        END
      )::text AS due_date
    FROM phases
    INNER JOIN authorized_sites ON authorized_sites.id = phases.site_id
    WHERE phases.status NOT IN ('completed', 'cancelled')
    UNION ALL
    SELECT
      sites.id,
      sites.id AS site_id,
      authorized_sites.name AS site_name,
      'site'::text AS kind,
      'Fin estimée du chantier' AS label,
      sites.status::text AS status,
      COALESCE(
        sites.estimated_end_date,
        CASE
          WHEN sites.start_date IS NOT NULL AND sites.estimated_duration_days IS NOT NULL
          THEN (sites.start_date + sites.estimated_duration_days * interval '1 day')::date
          ELSE NULL
        END
      )::text AS due_date
    FROM sites
    INNER JOIN authorized_sites ON authorized_sites.id = sites.id
    WHERE sites.status NOT IN ('completed', 'cancelled')
  )
  SELECT id, site_id, site_name, kind, label, status, due_date
  FROM deadline_candidates
  WHERE due_date IS NOT NULL
  ORDER BY due_date ASC, label ASC, id ASC
  LIMIT 8
`;
