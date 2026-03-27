CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_storage_mode TEXT NOT NULL CHECK (default_storage_mode IN ('metadata_only', 'encrypted_blobs', 'fully_p2p')),
  allow_room_override BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_mode_override TEXT CHECK (storage_mode_override IN ('metadata_only', 'encrypted_blobs', 'fully_p2p')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('org_admin', 'teacher', 'student')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user_email ON org_memberships (user_email);

CREATE TABLE IF NOT EXISTS org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('org_admin', 'teacher', 'student')),
  created_by_email TEXT,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses_count INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens (user_email);
