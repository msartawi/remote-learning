# FEMT Server Deployment (Ubuntu + Docker Compose)

This folder provides a one‑command deployment path for the backend + frontend reverse proxy on a single Ubuntu host. It is designed to run behind your existing public‑to‑private NAT:

- `www.femt.llc` (Cloudflare) → `92.253.101.187` → port forward `80/443/8080` → `192.168.1.202`

## Prerequisites

- Ubuntu 22.04+ server (publicly reachable on ports 80/443)
- DNS A record for `femt.llc` and `www.femt.llc` pointing to `92.253.101.187`
- Router port‑forwarding to the internal server

## Quick start (recommended)

1. Copy env file and update values:
   - `cp .env.example .env`
   - Set `DOMAIN`, `DOMAIN_WWW`, and `LETSENCRYPT_EMAIL`
2. Make scripts executable:
   - `chmod +x scripts/preflight.sh scripts/bootstrap.sh nginx/docker-entrypoint.d/99-gen-config.sh`
3. Run preflight checks:
   - `./scripts/preflight.sh`
4. Run the bootstrap installer:
   - `./scripts/bootstrap.sh`

## What this does

- Starts an HTTP reverse proxy (Nginx) for ACME challenges
- Issues TLS certificates with Let’s Encrypt
- Restarts Nginx with HTTPS enabled
- Routes:
  - `/` → frontend container
  - `/api/` → backend container
  - WebSocket paths (e.g., `/ws/`, `/socket.io/`) → backend container

## Manual cert issuance (optional)

If you prefer manual control:

1. Start Nginx (HTTP only):
   - `docker compose up -d nginx`
2. Request certs:
   - `docker compose run --rm certbot certonly --webroot -w /var/www/certbot --email you@example.com --agree-tos --no-eff-email -d femt.llc -d www.femt.llc`
3. Restart Nginx:
   - `docker compose restart nginx`

## Placeholders

The `frontend` container now builds and serves the React app. The backend container runs the org storage mode service (Node.js + Postgres).

### Frontend build variables

The frontend is built into a static Nginx image during `docker compose up`.
Set these in `deploy/.env` if you need different values:

- `VITE_API_BASE_URL` (default `/api`)
- `VITE_KEYCLOAK_URL` (example `https://auth.femt.llc`)
- `VITE_KEYCLOAK_REALM` (example `femt`)
- `VITE_KEYCLOAK_CLIENT_ID` (example `femt-frontend`)

## Ports used

- `80` and `443`: public HTTP/HTTPS
- `8080`: backend API (if you decide to expose directly)
- `2226`: SSH (as configured)

## Apache reverse proxy vhosts

If Apache terminates TLS in front of this stack, use the templates in
`deploy/apache/vhosts/` to avoid accidentally routing other domains to
the Keycloak vhost. This is especially important when you host
additional services such as `mail.semsm.com` on the same server.

## Notes

- This stack assumes Let’s Encrypt HTTP‑01 validation.
- For renewal, run: `docker compose run --rm certbot renew` (monthly).
