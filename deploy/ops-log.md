# Deployment Log

## 2026-03-04
- Added Docker Compose deployment scaffold in `deploy/` (nginx, certbot, placeholders).
- Uploaded `deploy/` to `/home/sartawi/remote-learning/deploy` on the server.
- Created `.env` on the server and set domain/email/public IP.
- Ran preflight checks; confirmed ports 80/443 in use by Apache.
- Started nginx on internal ports 8082/8443.
- Configured Apache as public TLS reverse proxy for `femt.llc` and `www.femt.llc`.
- Issued Let’s Encrypt certificate via certbot and enabled HTTPS.
- Added WebSocket proxy paths: `/ws/`, `/socket.io/`, `/signal/`, `/realtime/`, `/live/`, `/rtc/`, `/presence/`.
- Enabled cert renewal via `certbot-renew.timer` (twice daily) with Apache reload.
- Added backend scaffold for org storage modes (API + minimal admin UI) in `backend/`.
- Dockerized backend and added Postgres service in `deploy/docker-compose.yml`.
- Deployed backend + Postgres to server and verified `/api/health` returns 200 via HTTPS.
- Routed `/admin` through Nginx to backend admin UI.
- Added Keycloak configuration docs and env wiring.
- Enabled Keycloak auth in server `.env` and restarted backend.
- Deployed Keycloak (Docker) on 127.0.0.1:8085 and added Apache TLS vhost for `auth.femt.llc`.
- Bootstrapped new Keycloak admin user `femt-admin`.
- Bootstrapped temporary Keycloak admin user `temp-admin` for recovery.
- Set email/name for `temp-admin` and disabled `verify_email` in master realm to unblock admin login.
- Created `femt` realm, `femt-api` client, and realm roles (org_admin/teacher/student).
- Created test user `api-admin` and verified API auth end-to-end.
- Temporarily disabled audience check in backend (`KEYCLOAK_AUDIENCE=`) for testing.
