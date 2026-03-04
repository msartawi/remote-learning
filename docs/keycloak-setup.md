# Keycloak Setup (Org Storage Service)

This guide configures Keycloak for the org storage backend.

## 1) Create realm and client

1. Create a realm: `femt`
2. Create a client:
   - Client ID: `femt-api`
   - Protocol: `openid-connect`
   - Access type: `confidential` (recommended)
   - Valid redirect URIs: `https://femt.llc/*` (adjust as needed)
   - Web origins: `https://femt.llc`

## 2) Create roles

Realm roles:
- `org_admin`
- `teacher`
- `student`

## 3) Create users and assign roles

Assign `org_admin` to your admin user, `teacher` to instructors, etc.

## 4) Environment variables

Set these in `deploy/.env`:

```
AUTH_REQUIRED=true
KEYCLOAK_ISSUER=https://<keycloak-domain>/realms/femt
KEYCLOAK_JWKS_URL=https://<keycloak-domain>/realms/femt/protocol/openid-connect/certs
KEYCLOAK_AUDIENCE=femt-api
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=<admin-password>
KEYCLOAK_DB_PASSWORD=<db-password>
```

## 5) Apache reverse proxy (auth + other domains)

If Apache is your public TLS proxy, make sure the Keycloak vhost is not
the default vhost. Add explicit vhosts for each domain (e.g.,
`auth.femt.llc`, `mail.semsm.com`) so Apache does not route unmatched
hosts to Keycloak. Templates live in `deploy/apache/vhosts/`.

## 6) Restart backend

```
docker compose up -d --build backend
```

## 7) Test

Call the API with a bearer token containing realm roles:

```
curl -H "Authorization: Bearer <token>" https://femt.llc/api/orgs
```
