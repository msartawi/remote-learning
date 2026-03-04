#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${ROOT_DIR}/.env" ]; then
  # shellcheck disable=SC1090
  source "${ROOT_DIR}/.env"
fi

DOMAIN="${DOMAIN:-femt.llc}"
PUBLIC_IP="${PUBLIC_IP:-92.253.101.187}"
REQUIRED_PORTS=(80 443 8080 2226)

echo "== System info =="
uname -a
if [ -f /etc/os-release ]; then
  cat /etc/os-release
fi

echo
echo "== Disk/RAM =="
df -h /
free -h || true

echo
echo "== Port checks =="
for p in "${REQUIRED_PORTS[@]}"; do
  if command -v ss >/dev/null 2>&1; then
    if ss -ltnp | grep -qE ":${p}[[:space:]]"; then
      echo "Port ${p}: IN USE"
    else
      echo "Port ${p}: FREE"
    fi
  elif command -v lsof >/dev/null 2>&1; then
    if lsof -iTCP:"${p}" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "Port ${p}: IN USE"
    else
      echo "Port ${p}: FREE"
    fi
  else
    echo "Port ${p}: unable to check (ss/lsof missing)"
  fi
done

echo
echo "== DNS check =="
if command -v getent >/dev/null 2>&1; then
  getent hosts "${DOMAIN}" || true
else
  echo "getent not available"
fi

echo
echo "== Firewall status =="
if command -v ufw >/dev/null 2>&1; then
  ufw status verbose || true
else
  echo "ufw not installed"
fi

echo
echo "== Docker =="
docker --version || echo "docker not installed"
docker compose version || echo "docker compose not installed"

echo
echo "== NAT note =="
echo "Public IP: ${PUBLIC_IP}"
echo "Ensure router forwards 80/443/8080 to local server."
