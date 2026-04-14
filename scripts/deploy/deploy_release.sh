#!/usr/bin/env bash
#
# Deploy a partir do diretório atual (clone). Backup DB → down stack anterior → up nova
# → healthcheck → promove symlinks app/current e app/previous. Rollback automático no ERR.
#
# Ver scripts/deploy/README.md (downtime entre down e up; container_name fixos no compose).
#
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

rollback_on_error() {
  # Evita reentrada do trap ERR e permite concluir limpeza mesmo com falhas pontuais
  trap - ERR
  set +e

  echo
  echo "========== FALHA NO DEPLOY =========="
  echo "Linha: ${1:-desconhecida}"
  echo "Comando: ${2:-desconhecido}"
  echo "Iniciando rollback..."

  if [[ -d "$NEW_RELEASE_DIR/infra/docker" ]]; then
    echo "Derrubando release com falha..."
    cd "$NEW_RELEASE_DIR/infra/docker"
    docker compose --env-file "$SHARED_DIR/.env" -f docker-compose.prod.yml down || true
  fi

  if [[ -n "${CURRENT_TARGET:-}" && -d "$CURRENT_TARGET" ]]; then
    echo "Voltando para release anterior: $CURRENT_TARGET"
    ln -sfn "$CURRENT_TARGET" "$CURRENT_LINK" || true

    cd "$CURRENT_TARGET/infra/docker" || true
    docker compose --env-file "$SHARED_DIR/.env" -f docker-compose.prod.yml up -d --build || true

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
    docker compose --env-file "$SHARED_DIR/.env" -f docker-compose.prod.yml ps || true

    echo "Logs do backend após rollback:"
    docker compose --env-file "$SHARED_DIR/.env" -f docker-compose.prod.yml logs backend --tail=120 || true
  else
    echo "Nenhuma release anterior encontrada para rollback."
    echo "Motivo típico: não existe o symlink $CURRENT_LINK (primeiro deploy neste servidor)"
    echo "ou o deploy anterior nunca chegou a promover 'current'."
    echo "Neste caso não há stack antiga para religar: suba manualmente o compose a partir"
    echo "de um clone válido em $RELEASES_DIR ou restaure o backup do banco se necessário."
    echo "O volume do Postgres costuma persistir mesmo após 'docker compose down'."
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

log "CONTEXTO DE ROLLBACK"
if [[ -n "${CURRENT_TARGET:-}" && -d "$CURRENT_TARGET" ]]; then
  echo "Release anterior (rollback disponível): $CURRENT_TARGET"
else
  if [[ -L "$CURRENT_LINK" ]]; then
    echo "AVISO: $CURRENT_LINK existe mas o destino não é um diretório válido: $(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
  elif [[ -e "$CURRENT_LINK" ]]; then
    echo "AVISO: $CURRENT_LINK existe mas não é symlink; rollback automático não terá release anterior."
  else
    echo "Sem symlink $CURRENT_LINK — primeiro deploy neste APP_DIR ou current ainda não criado."
  fi
  echo "Rollback automático em caso de falha só poderá derrubar a nova release e remover o clone com erro."
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

log "PARANDO STACK ANTERIOR (libera container_name fixo no compose)"
if [[ -n "${CURRENT_TARGET:-}" && -d "$CURRENT_TARGET" ]]; then
  cd "$CURRENT_TARGET/infra/docker"
  docker compose --env-file "$SHARED_DIR/.env" -f docker-compose.prod.yml down
fi

log "SUBINDO NOVA RELEASE"
cd "$NEW_RELEASE_DIR/infra/docker"
docker compose --env-file "$SHARED_DIR/.env" -f docker-compose.prod.yml up -d --build

log "AGUARDANDO SERVIÇOS"
sleep 15

log "STATUS DOS CONTAINERS"
docker compose --env-file "$SHARED_DIR/.env" -f docker-compose.prod.yml ps

log "LOGS INICIAIS DO BACKEND"
docker compose --env-file "$SHARED_DIR/.env" -f docker-compose.prod.yml logs backend --tail=120 || true

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