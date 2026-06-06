#!/usr/bin/env bash
#
# Deploy a partir do diretório atual.
# Fluxo:
# backup DB → down stack anterior → up nova release → migrations → healthcheck
# → promove symlinks app/current e app/previous.
#
# RESET_DB=false por padrão.
# RESET_DB=true remove volumes do Docker Compose e recria o banco.
#
set -Eeuo pipefail

APP_ROOT="/opt/zfw"
RELEASES_DIR="$APP_ROOT/releases"
APP_DIR="$APP_ROOT/app"
SHARED_DIR="$APP_ROOT/shared"
BACKUP_DIR="$SHARED_DIR/backups/db"

TARGET_REF="${1:-main}"
RESET_DB="${RESET_DB:-false}"

CURRENT_WORKDIR="$(pwd)"
NEW_RELEASE_DIR="$CURRENT_WORKDIR"
CURRENT_LINK="${APP_DIR}/current"
PREVIOUS_LINK="${APP_DIR}/previous"

COMPOSE_BASE_FILE="docker-compose.prod.yml"
COMPOSE_MONITORING_FILE="docker-compose.monitoring.yml"
COMPOSE_ENV_FILE="$SHARED_DIR/.env"
COMPOSE_DIR="$NEW_RELEASE_DIR/infra/docker"

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

compose_new() {
  docker compose \
    --env-file "$COMPOSE_ENV_FILE" \
    -f "$COMPOSE_BASE_FILE" \
    -f "$COMPOSE_MONITORING_FILE" \
    "$@"
}

compose_here() {
  local args=(--env-file "$SHARED_DIR/.env" -f "$COMPOSE_BASE_FILE")

  if [[ -f "$COMPOSE_MONITORING_FILE" ]]; then
    args+=(-f "$COMPOSE_MONITORING_FILE")
  fi

  docker compose "${args[@]}" "$@"
}

check_health() {
  log "HEALTHCHECK"

  for i in {1..12}; do
    if curl -fsS http://127.0.0.1:8000/api/v1/health/ > /dev/null; then
      echo "Healthcheck OK"
      return 0
    fi

    echo "Tentativa $i falhou. Aguardando 5s..."
    sleep 5
  done

  echo "Healthcheck falhou após múltiplas tentativas."
  return 1
}

backup_database_if_possible() {
  log "BACKUP DO BANCO"

  # shellcheck disable=SC1091
  source "$SHARED_DIR/.env"

  TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
  SHORT_REF="$(echo "$TARGET_REF" | cut -c1-7)"
  BACKUP_FILE="$BACKUP_DIR/${TIMESTAMP}-${SHORT_REF}.sql.gz"

  if ! docker ps --format '{{.Names}}' | grep -q '^configurador_painel_db$'; then
    echo "Container configurador_painel_db não está rodando. Pulando backup."
    return 0
  fi

  echo "Gerando backup do banco atual..."

  docker exec configurador_painel_db sh -c \
    "PGPASSWORD='$DB_PASSWORD' pg_dump -U '$DB_USER' -d '$DB_NAME'" | gzip > "$BACKUP_FILE"

  echo "Backup salvo em: $BACKUP_FILE"
}

rollback_on_error() {
  trap - ERR
  set +e

  echo
  echo "========== FALHA NO DEPLOY =========="
  echo "Linha: ${1:-desconhecida}"
  echo "Comando: ${2:-desconhecido}"
  echo "Iniciando rollback..."

  if [[ -d "$NEW_RELEASE_DIR/infra/docker" ]]; then
    echo "Derrubando release com falha..."
    cd "$NEW_RELEASE_DIR/infra/docker" || true
    compose_here down || true
  fi

  if [[ "$RESET_DB" == "true" ]]; then
    echo "RESET_DB=true foi usado neste deploy."
    echo "Rollback automático pode não restaurar o banco anterior, pois os volumes podem ter sido removidos."
    echo "Se necessário, restaure manualmente um backup em: $BACKUP_DIR"
  fi

  if [[ -n "${CURRENT_TARGET:-}" && -d "$CURRENT_TARGET" ]]; then
    echo "Voltando para release anterior: $CURRENT_TARGET"
    ln -sfn "$CURRENT_TARGET" "$CURRENT_LINK" || true

    cd "$CURRENT_TARGET/infra/docker" || true
    compose_here up -d --build || true

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
    compose_here ps || true

    echo "Logs do backend após rollback:"
    compose_here logs backend --tail=120 || true
  else
    echo "Nenhuma release anterior encontrada para rollback."
    echo "Motivo típico: primeiro deploy ou symlink current ainda não criado."
  fi

  if [[ -d "$NEW_RELEASE_DIR" ]]; then
    echo "Removendo release com falha: $NEW_RELEASE_DIR"
    rm -rf "$NEW_RELEASE_DIR" || true
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

log "CONTEXTO DO DEPLOY"
echo "Target ref: $TARGET_REF"
echo "Reset DB: $RESET_DB"
echo "Nova release: $NEW_RELEASE_DIR"

log "CONTEXTO DE ROLLBACK"
if [[ -n "${CURRENT_TARGET:-}" && -d "$CURRENT_TARGET" ]]; then
  echo "Release anterior disponível para rollback: $CURRENT_TARGET"
else
  echo "Sem release anterior válida para rollback automático."
fi

log "VALIDANDO ARQUIVOS"
require_file "infra/docker/docker-compose.prod.yml"
require_file "infra/docker/docker-compose.monitoring.yml"
require_file "infra/docker/Dockerfile.backend"
require_file "infra/docker/Dockerfile.frontend"
require_file "infra/monitoring/alertmanager/alertmanager.yml"
require_file "infra/monitoring/blackbox/blackbox.yml"
require_file "infra/monitoring/prometheus/prometheus.yml"
require_file "infra/monitoring/prometheus/rules/alerts.yml"
require_file "backend/manage.py"
require_file "$SHARED_DIR/.env"

log "VALIDANDO COMPOSE"
cd "$COMPOSE_DIR"
compose_new config > /dev/null

backup_database_if_possible

log "PARANDO STACK ANTERIOR"
if [[ -n "${CURRENT_TARGET:-}" && -d "$CURRENT_TARGET" ]]; then
  cd "$CURRENT_TARGET/infra/docker"

  if [[ "$RESET_DB" == "true" ]]; then
    echo "RESET_DB=true: derrubando stack anterior e removendo volumes..."
    compose_here down -v
  else
    compose_here down
  fi
else
  echo "Nenhuma stack anterior encontrada."
fi

log "SUBINDO NOVA RELEASE"
cd "$COMPOSE_DIR"
compose_new up -d --build

log "AGUARDANDO SERVIÇOS"
sleep 15

log "STATUS DOS CONTAINERS"
compose_new ps

log "LOGS INICIAIS DO BACKEND"
compose_new logs backend --tail=120 || true

log "APLICANDO MIGRATIONS"
compose_new exec -T backend python manage.py migrate

log "COLETANDO ARQUIVOS ESTÁTICOS"
compose_new exec -T backend python manage.py collectstatic --noinput || true

check_health || rollback_on_error "$LINENO" "healthcheck"

log "PROMOVENDO RELEASE"
if [[ -n "${CURRENT_TARGET:-}" && -d "$CURRENT_TARGET" ]]; then
  ln -sfn "$CURRENT_TARGET" "$PREVIOUS_LINK"
fi

ln -sfn "$NEW_RELEASE_DIR" "$CURRENT_LINK"

log "LIMPANDO RELEASES ANTIGAS"
trap - ERR
set +e

cd "$RELEASES_DIR" || true
ls -1dt */ 2>/dev/null | tail -n +6 | xargs -r rm -rf

log "DEPLOY CONCLUÍDO"
echo "Release ativa: $(readlink -f "$CURRENT_LINK")"
