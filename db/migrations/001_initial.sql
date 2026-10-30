CREATE TABLE studies (
  id uuid PRIMARY KEY,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '',
  locale text NOT NULL CHECK (locale IN ('pt-BR', 'en')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  consent_title text NOT NULL CHECK (length(trim(consent_title)) > 0),
  consent_body text NOT NULL CHECK (length(trim(consent_body)) > 0),
  demographic_fields jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(demographic_fields) = 'array'),
  chatbots jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(chatbots) = 'array'),
  chatbot_quantity smallint NOT NULL CHECK (chatbot_quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE participant_sessions (
  id uuid PRIMARY KEY,
  study_id uuid NOT NULL REFERENCES studies(id) ON DELETE RESTRICT,
  code_hash char(64) NOT NULL UNIQUE,
  encrypted_code text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('pt-BR', 'en')),
  study_snapshot jsonb NOT NULL CHECK (jsonb_typeof(study_snapshot) = 'object'),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'consented', 'in_progress', 'completed', 'declined')),
  consented_at timestamptz,
  demographics jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(demographics) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'declined' AND consented_at IS NULL AND demographics = '{}'::jsonb)
    OR status <> 'declined')
);

CREATE INDEX participant_sessions_study_status_idx ON participant_sessions(study_id, status);

CREATE TABLE participant_assignments (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES participant_sessions(id) ON DELETE CASCADE,
  chatbot_id text NOT NULL,
  chatbot_snapshot jsonb NOT NULL CHECK (jsonb_typeof(chatbot_snapshot) = 'object'),
  position smallint NOT NULL CHECK (position > 0),
  answers jsonb CHECK (answers IS NULL OR jsonb_typeof(answers) = 'array'),
  completed_at timestamptz,
  UNIQUE (session_id, chatbot_id),
  UNIQUE (session_id, position),
  CHECK ((answers IS NULL AND completed_at IS NULL) OR (answers IS NOT NULL AND completed_at IS NOT NULL))
);

CREATE INDEX participant_assignments_session_idx ON participant_assignments(session_id, position);
