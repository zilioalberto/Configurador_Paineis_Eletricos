#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/opt/zfw"
RELEASES_DIR="$APP_ROOT/releases"
APP_DIR="$APP_ROOT/app"
SHARED_DIR="$APP_ROOT/shared"
BACKUP_DIR="$SHARED_DIR/backups/db"

TARGET_REF="${1:-main}"
CURRENT_WORKDIR="$(pwd)"
NEW_RELEASE_DIR="$CURRENT_WORKDIR"
CURRENT_LINK="${APP_DIR}/current"
PREVIOUS_LINK="${APP_DIR}/previous"

log() {
  echo
  echo "========== $1 =========="
}

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Arquivo obrigatório não encontrado: $path"
    exit 1
  fi
}

rollback_on_error() {
  echo
  echo "========== FALHA NO DEPLOY =========="
  echo "Linha: ${1:-desconhecida}"
  echo "Comando: ${2:-desconhecido}"
  echo "Iniciando rollback..."

  if [[ -d "$NEW_RELEASE_DIR/infra/docker" ]]; then
    echo "Derrubando release com falha..."
    cd "$NEW_RELEASE_DIR/infra/docker"
    docker compose --env-file /opt/zfw/shared/.env -f docker-compose.prod.yml down || true
  fi

  if [[ -n "${CURRENT_TARGET:-}" && -d "$CURRENT_TARGET" ]]; then
    echo "Voltando para release anterior: $CURRENT_TARGET"
    ln -sfn "$CURRENT_TARGET" "$CURRENT_LINK"

    cd "$CURRENT_TARGET/infra/docker"
    docker compose --env-file /opt/zfw/shared/.env -f docker-compose.prod.yml up -d --build || true

    echo "Aguardando rollback estabilizar..."
    sleep 15

    echo "Validando rollback..."
    for i in {1..12}; do
      if curl -fsS http://127.0.0.1:8000/api/v1/health/ > /dev/null; then
        echo "Rollback validado com sucesso."
        break
      fi

      echo "Tentativa de validação do rollback $i falhou. Aguardando 5s..."
      sleep 5

      if [[ "$i" -eq 12 ]]; then
        echo "Rollback não conseguiu restaurar a aplicação."
      fi
    done

    echo "Status após rollback:"
    docker compose --env-file /opt/zfw/shared/.env -f docker-compose.prod.yml ps || true

    echo "Logs do backend após rollback:"
    docker compose --env-file /opt/zfw/shared/.env -f docker-compose.prod.yml logs backend --tail=120 || true
  else
    echo "Nenhuma release anterior encontrada para rollback."
  fi

  if [[ -d "$NEW_RELEASE_DIR" ]]; then
    echo "Removendo release com falha: $NEW_RELEASE_DIR"
    rm -rf "$NEW_RELEASE_DIR"
  fi

  exit 1
}

trap 'rollback_on_error "$LINENO" "$BASH_COMMAND"' ERR

mkdir -p "$RELEASES_DIR" "$APP_DIR" "$SHARED_DIR" "$BACKUP_DIR"

if [[ -L "$CURRENT_LINK" ]]; then
  CURRENT_TARGET="$(readlink -f "$CURRENT_LINK")"
else
  CURRENT_TARGET=""
fi

log "RELEASE ATUAL"
echo "$NEW_RELEASE_DIR"

log "VALIDANDO ARQUIVOS"
require_file "infra/docker/docker-compose.prod.yml"
require_file "infra/docker/Dockerfile.backend"
require_file "infra/docker/Dockerfile.frontend"
require_file "manage.py"
require_file "$SHARED_DIR/.env"

log "BACKUP DO BANCO"
# shellcheck disable=SC1091
source "$SHARED_DIR/.env"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SHORT_REF="$(echo "$TARGET_REF" | cut -c1-7)"
BACKUP_FILE="$BACKUP_DIR/${TIMESTAMP}-${SHORT_REF}.sql.gz"

docker exec configurador_painel_db sh -c \
  "PGPASSWORD='$DB_PASSWORD' pg_dump -U '$DB_USER' -d '$DB_NAME'" | gzip > "$BACKUP_FILE"

echo "Backup salvo em: $BACKUP_FILE"

log "SUBINDO NOVA RELEASE"
cd "$NEW_RELEASE_DIR/infra/docker"
docker compose --env-file /opt/zfw/shared/.env -f docker-compose.prod.yml up -d --build

log "AGUARDANDO SERVIÇOS"
sleep 15

log "STATUS DOS CONTAINERS"
docker compose --env-file /opt/zfw/shared/.env -f docker-compose.prod.yml ps

log "LOGS INICIAIS DO BACKEND"
docker compose --env-file /opt/zfw/shared/.env -f docker-compose.prod.yml logs backend --tail=120 || true

log "HEALTHCHECK"
for i in {1..12}; do
  if curl -fsS http://127.0.0.1:8000/api/v1/health/ > /dev/null; then
    echo "Healthcheck OK"
    break
  fi

  echo "Tentativa $i falhou. Aguardando 5s..."
  sleep 5

  if [[ "$i" -eq 12 ]]; then
    echo "Healthcheck falhou após múltiplas tentativas."
    exit 1
  fi
done

log "PROMOVENDO RELEASE"
if [[ -n "${CURRENT_TARGET:-}" && -d "$CURRENT_TARGET" ]]; then
  ln -sfn "$CURRENT_TARGET" "$PREVIOUS_LINK"
fi

ln -sfn "$NEW_RELEASE_DIR" "$CURRENT_LINK"

log "LIMPANDO RELEASES ANTIGAS"
cd "$RELEASES_DIR"
ls -1dt */ | tail -n +6 | xargs -r rm -rf

log "DEPLOY CONCLUÍDO"
echo "Release ativa: $(readlink -f "$CURRENT_LINK")"