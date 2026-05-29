CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  type device_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  key_prefix text NOT NULL UNIQUE,
  key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  revoked_at timestamptz,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE relay_drone_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  drone_device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT relay_drone_links_distinct_devices CHECK (relay_device_id <> drone_device_id)
);

CREATE TABLE drone_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  dronist_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  mission_date timestamptz NOT NULL,
  estimated_duration_minutes integer,
  status mission_status NOT NULL DEFAULT 'planned',
  area_geojson jsonb NOT NULL DEFAULT '{}'::jsonb,
  stream_url text,
  telemetry jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drone_mission_id uuid NOT NULL REFERENCES drone_missions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  drone_device_id uuid NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  relay_device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  name varchar(180) NOT NULL,
  description text,
  flight_mode varchar(80) NOT NULL,
  status varchar(80) NOT NULL DEFAULT 'planned',
  altitude_max double precision,
  speed_max double precision,
  planned_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE waypoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  altitude double precision NOT NULL,
  sequence integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT waypoints_sequence_per_flight_unique UNIQUE (flight_id, sequence)
);

CREATE INDEX devices_organization_id_idx ON devices (organization_id);
CREATE INDEX api_keys_device_id_idx ON api_keys (device_id);
CREATE UNIQUE INDEX relay_drone_links_active_drone_unique
  ON relay_drone_links (drone_device_id)
  WHERE active = true AND revoked_at IS NULL;
CREATE UNIQUE INDEX relay_drone_links_active_pair_unique
  ON relay_drone_links (relay_device_id, drone_device_id)
  WHERE active = true AND revoked_at IS NULL;
CREATE INDEX drone_missions_site_id_idx ON drone_missions (site_id);
CREATE INDEX drone_missions_dronist_id_idx ON drone_missions (dronist_id);
CREATE INDEX flights_drone_mission_id_idx ON flights (drone_mission_id);
CREATE INDEX waypoints_flight_id_idx ON waypoints (flight_id);
