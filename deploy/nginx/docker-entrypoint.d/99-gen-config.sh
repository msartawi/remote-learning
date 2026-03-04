#!/bin/sh
set -eu

TEMPLATE_DIR="/etc/nginx/templates"
CONF_OUT="/etc/nginx/conf.d/app.conf"

DOMAIN="${DOMAIN:-example.local}"
DOMAIN_WWW="${DOMAIN_WWW:-www.example.local}"
FRONTEND_UPSTREAM="${FRONTEND_UPSTREAM:-http://frontend:80}"
BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-http://backend:80}"

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  TEMPLATE="${TEMPLATE_DIR}/app-https.conf.template"
else
  TEMPLATE="${TEMPLATE_DIR}/app-http.conf.template"
fi

envsubst '${DOMAIN} ${DOMAIN_WWW} ${FRONTEND_UPSTREAM} ${BACKEND_UPSTREAM}' < "${TEMPLATE}" > "${CONF_OUT}"
