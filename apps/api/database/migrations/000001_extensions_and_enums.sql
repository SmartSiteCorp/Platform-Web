CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE user_status AS ENUM ('invited', 'active', 'suspended', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE site_status AS ENUM ('planned', 'in_progress', 'on_hold', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE phase_status AS ENUM ('planned', 'in_progress', 'completed', 'blocked', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'blocked', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE file_category AS ENUM (
    'document',
    'photo',
    'pdf',
    'bim_ifc',
    'model_3d',
    'lidar_scan',
    'point_cloud',
    'plan_2d',
    'drone_media',
    'ai_report',
    'export_obj',
    'export_ply',
    'export_laz',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE device_type AS ENUM ('drone', 'relay', 'client', 'dashboard', 'server');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE mission_status AS ENUM ('planned', 'ready', 'in_progress', 'completed', 'cancelled', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE scan_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE partner_request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
