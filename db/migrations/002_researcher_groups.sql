CREATE TABLE researcher_groups (
  id uuid PRIMARY KEY,
  code text NOT NULL CHECK (length(trim(code)) BETWEEN 3 AND 64),
  normalized_code text NOT NULL UNIQUE,
  password_salt char(32) NOT NULL CHECK (password_salt ~ '^[a-f0-9]{32}$'),
  password_hash char(128) NOT NULL CHECK (password_hash ~ '^[a-f0-9]{128}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE studies
  ADD COLUMN group_id uuid REFERENCES researcher_groups(id) ON DELETE RESTRICT;

CREATE INDEX studies_group_updated_idx ON studies(group_id, updated_at DESC);
