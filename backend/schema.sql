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
