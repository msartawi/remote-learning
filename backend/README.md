# FEMT Backend (Org Storage Modes)

This service implements organization storage mode settings with org defaults and per‑room overrides.

## Requirements

- Node.js 20+
- Postgres 14+

## Setup

1. Create a database and apply schema:
   - `psql "$DATABASE_URL" -f schema.sql`
2. Configure env:
   - `DATABASE_URL=postgres://user:pass@host:5432/femt`
   - `PORT=3001`
   - `AUTH_REQUIRED=false` (dev)
   - `KEYCLOAK_ISSUER=https://your-keycloak/realms/femt`
   - `KEYCLOAK_JWKS_URL=https://your-keycloak/realms/femt/protocol/openid-connect/certs`
   - `KEYCLOAK_AUDIENCE=femt-api` (optional)
3. Run:
   - `npm install`
   - `npm run dev`

## API

- `GET /api/orgs`
- `POST /api/orgs`
- `GET /api/orgs/:orgId/settings`
- `PUT /api/orgs/:orgId/settings`
- `POST /api/orgs/:orgId/rooms`
- `GET /api/rooms/:roomId/settings`
- `PUT /api/rooms/:roomId/settings`

## Admin UI

- `GET /admin/orgs`
- `GET /admin/orgs/:orgId`

## Keycloak

See `docs/keycloak-setup.md` for configuration steps.
