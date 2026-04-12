#!/usr/bin/env bash
#
# Rollback manual após um deploy já promovido (symlink current = release ruim).
#
# Pré-requisito: /opt/zfw/app/previous deve existir (criado no deploy quando já havia
# uma release ativa). No primeiro deploy da máquina isso pode não existir — use só o
# rollback automático do deploy_release.sh nesse caso.
#
# Fluxo: down(current) → troca symlinks current/previous → up(ex-previous).
# Documentação: scripts/deploy/README.md
#
set -Eeuo pipefail

APP_ROOT="/opt/zfw"
APP_DIR="$APP_ROOT/app"
SHARED_DIR="$APP_ROOT/shared"
CURRENT_LINK="${APP_DIR}/current"
PREVIOUS_LINK="${APP_DIR}/previous"
COMPOSE_ENV="$SHARED_DIR/.env"
COMPOSE_FILE="docker-compose.prod.yml"

log() {
  echo
  echo "========== $1 =========="
}

require_link() {
  local path="$1"
  local label="$2"
  if [[ ! -L "$path" ]]; then
    echo "Symlink obrigatório não encontrado ($label): $path"
    exit 1
  fi
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

require_link "$CURRENT_LINK" "current"
require_link "$PREVIOUS_LINK" "previous"

ACTIVE_DIR="$(readlink -f "$CURRENT_LINK")"
ROLLBACK_DIR="$(readlink -f "$PREVIOUS_LINK")"

if [[ ! -d "$ACTIVE_DIR" || ! -d "$ROLLBACK_DIR" ]]; then
  echo "Diretório de release inválido."
  echo "current -> $ACTIVE_DIR"
  echo "previous -> $ROLLBACK_DIR"
  exit 1
fi

if [[ "$ACTIVE_DIR" == "$ROLLBACK_DIR" ]]; then
  echo "current e previous apontam para o mesmo diretório; nada a fazer."
  exit 1
fi

if [[ ! -f "$COMPOSE_ENV" ]]; then
  echo "Arquivo de ambiente não encontrado: $COMPOSE_ENV"
  exit 1
fi

log "ROLLBACK MANUAL"
echo "Desligando release ativa: $ACTIVE_DIR"
echo "Reativando: $ROLLBACK_DIR"

log "PARANDO STACK ATUAL"
cd "$ACTIVE_DIR/infra/docker"
docker compose --env-file "$COMPOSE_ENV" -f "$COMPOSE_FILE" down

log "ATUALIZANDO SYMLINKS (troca current <-> previous)"
ln -sfn "$ROLLBACK_DIR" "$CURRENT_LINK"
ln -sfn "$ACTIVE_DIR" "$PREVIOUS_LINK"

log "SUBINDO RELEASE ANTERIOR"
cd "$ROLLBACK_DIR/infra/docker"
docker compose --env-file "$COMPOSE_ENV" -f "$COMPOSE_FILE" up -d --build

log "AGUARDANDO SERVIÇOS"
sleep 15

docker compose --env-file "$COMPOSE_ENV" -f "$COMPOSE_FILE" ps

check_health || {
  echo "Healthcheck falhou após rollback manual. Verifique logs e symlinks."
  exit 1
}

log "ROLLBACK MANUAL CONCLUÍDO"
echo "Release ativa: $(readlink -f "$CURRENT_LINK")"
