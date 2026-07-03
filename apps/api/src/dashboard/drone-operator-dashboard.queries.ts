export const droneOperatorMissionsQuery = `
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
    drone_missions.id,
    drone_missions.site_id,
    authorized_sites.name AS site_name,
    drone_missions.mission_date,
    drone_missions.estimated_duration_minutes,
    drone_missions.status,
    drone_missions.telemetry,
    latest_flight.id AS flight_id,
    latest_flight.name AS flight_name,
    latest_flight.status AS flight_status,
    latest_flight.drone_device_id AS drone_id,
    latest_flight.drone_name
  FROM drone_missions
  INNER JOIN authorized_sites ON authorized_sites.id = drone_missions.site_id
  LEFT JOIN LATERAL (
    SELECT
      flights.id,
      flights.name,
      flights.status,
      flights.drone_device_id,
      devices.name AS drone_name,
      COALESCE(flights.planned_date, flights.created_at) AS ordering_date
    FROM flights
    INNER JOIN devices ON devices.id = flights.drone_device_id
    WHERE flights.drone_mission_id = drone_missions.id
      AND devices.organization_id = $1
      AND devices.type = 'drone'
    ORDER BY
      flights.status = 'in_progress' DESC,
      ordering_date DESC,
      flights.id ASC
    LIMIT 1
  ) latest_flight ON TRUE
  WHERE drone_missions.dronist_id = $2
  ORDER BY
    drone_missions.status = 'in_progress' DESC,
    drone_missions.status = 'planned' DESC,
    drone_missions.mission_date ASC,
    drone_missions.id ASC
  LIMIT 12
`;
