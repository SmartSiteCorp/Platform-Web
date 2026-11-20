CREATE TABLE phase_worker_assignments (
  phase_id uuid NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  worker_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (phase_id, worker_user_id)
);

CREATE INDEX phase_worker_assignments_worker_user_id_idx
  ON phase_worker_assignments (worker_user_id);

CREATE INDEX phase_worker_assignments_assigned_by_idx
  ON phase_worker_assignments (assigned_by);
