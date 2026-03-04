#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

if [ ! -f ".env" ]; then
  cp .env.example .env

  read -rp "Domain (e.g., femt.llc): " DOMAIN
  read -rp "WWW domain (e.g., www.femt.llc, blank to skip): " DOMAIN_WWW
  read -rp "Let's Encrypt email: " LETSENCRYPT_EMAIL

  sed -i "s|^DOMAIN=.*|DOMAIN=${DOMAIN}|" .env
  if [ -n "${DOMAIN_WWW}" ]; then
    sed -i "s|^DOMAIN_WWW=.*|DOMAIN_WWW=${DOMAIN_WWW}|" .env
  fi
  sed -i "s|^LETSENCRYPT_EMAIL=.*|LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL}|" .env
fi

# shellcheck disable=SC1090
source .env

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Install Docker first, then re-run this script."
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin not found. Install it, then re-run this script."
  exit 1
fi

echo "Starting nginx (HTTP only) to serve ACME challenges..."
docker compose up -d nginx

CERTBOT_ARGS=(certonly --webroot -w /var/www/certbot --email "${LETSENCRYPT_EMAIL}" --agree-tos --no-eff-email)
CERTBOT_ARGS+=(-d "${DOMAIN}")
if [ -n "${DOMAIN_WWW}" ]; then
  CERTBOT_ARGS+=(-d "${DOMAIN_WWW}")
fi

echo "Requesting TLS certificates..."
docker compose run --rm certbot "${CERTBOT_ARGS[@]}"

echo "Restarting nginx to enable HTTPS..."
docker compose restart nginx

echo "Done. Visit: https://${DOMAIN}"
