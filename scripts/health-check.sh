#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL=${BACKEND_URL:-http://localhost:8000}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:5173}
ADMIN_EMAIL=${ADMIN_EMAIL:-pacheco@rhynoproject.com.br}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-123}

log() { echo "[$(date +'%H:%M:%S')] $*"; }

check_http() {
  local name=$1
  local url=$2
  log "Checando ${name} em ${url}"
  curl -fsSL "${url}" >/dev/null
  log "OK: ${name}"
}

check_http "Frontend" "${FRONTEND_URL}"
check_http "Backend docs" "${BACKEND_URL}/docs"

log "Testando login em ${BACKEND_URL}/auth/login com username=${ADMIN_EMAIL}"
login_resp=$(curl -fsSL -X POST "${BACKEND_URL}/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_EMAIL}&password=${ADMIN_PASSWORD}") || { log "Falha ao autenticar"; exit 1; }

token=$(python3 - "${login_resp}" <<'PY'
import json
import sys
try:
    data = json.loads(sys.argv[1])
    print(data.get('access_token', ''))
except Exception:
    print('')
PY
)

if [ -z "${token}" ]; then
  log "Token não obtido"; exit 1
fi

log "Token obtido, validando endpoint protegido /dashboard/stats"
curl -fsSL -H "Authorization: Bearer ${token}" "${BACKEND_URL}/dashboard/stats" >/dev/null
log "OK: dashboard/stats"

log "Health check concluído com sucesso."
