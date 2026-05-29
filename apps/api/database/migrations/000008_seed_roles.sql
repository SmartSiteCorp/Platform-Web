INSERT INTO roles (code, label)
VALUES
  ('administrateur', 'Administrateur'),
  ('chef_chantier', 'Chef de chantier'),
  ('ouvrier', 'Ouvrier'),
  ('architecte', 'Architecte'),
  ('droniste', 'Droniste')
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label;
